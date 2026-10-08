import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { stockMovements, products, users, productBatches } from '../../database/schema'
import { desc, and, eq, gte, lte, ilike, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)

  const productId = query.product_id ? Number(query.product_id) : undefined
  const type = query.type ? String(query.type).trim() : undefined
  const search = query.q ? String(query.q).trim() : undefined
  const startDate = query.start_date ? String(query.start_date) : undefined
  const endDate = query.end_date ? String(query.end_date) : undefined

  const db = await useDb()

  const conditions = []

  if (productId) {
    conditions.push(eq(stockMovements.productId, productId))
  }

  if (type && type !== 'ALL') {
    conditions.push(eq(stockMovements.type, type))
  }

  if (startDate) {
    conditions.push(gte(stockMovements.createdAt, startDate))
  }

  if (endDate) {
    conditions.push(lte(stockMovements.createdAt, endDate + ' 23:59:59'))
  }

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.barcode, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(stockMovements.referenceId, `%${search}%`),
        ilike(stockMovements.reason, `%${search}%`)
      )
    )
  }

  const list = await db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      productBarcode: products.barcode,
      productUnit: products.unit,
      batchId: stockMovements.batchId,
      batchNumber: productBatches.batchNumber,
      userId: stockMovements.userId,
      userName: users.name,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      previousStock: stockMovements.previousStock,
      newStock: stockMovements.newStock,
      unitCost: stockMovements.unitCost,
      referenceId: stockMovements.referenceId,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt
    })
    .from(stockMovements)
    .innerJoin(products, eq(stockMovements.productId, products.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .leftJoin(productBatches, eq(stockMovements.batchId, productBatches.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(stockMovements.createdAt))
    .limit(100)

  return { movements: list }
})
