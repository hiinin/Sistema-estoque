import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, suppliers } from '../../database/schema'
import { desc, ilike, or, and, eq, lte, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const query = getQuery(event)
  const search = query.q ? String(query.q).trim() : ''
  const barcode = query.barcode ? String(query.barcode).trim() : ''
  const categoryId = query.category_id ? Number(query.category_id) : undefined
  const supplierId = query.supplier_id ? Number(query.supplier_id) : undefined
  const activeParam = query.active
  const lowStockOnly = query.low_stock === 'true'

  const db = await useDb()

  const conditions = []

  // Busca exata por código de barras (prioritária para PDV / scanner)
  if (barcode) {
    conditions.push(eq(products.barcode, barcode))
  } else if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.barcode, `%${search}%`),
        ilike(products.sku, `%${search}%`)
      )
    )
  }

  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId))
  }

  if (supplierId) {
    conditions.push(eq(products.supplierId, supplierId))
  }

  if (activeParam === 'true') {
    conditions.push(eq(products.active, true))
  } else if (activeParam === 'false') {
    conditions.push(eq(products.active, false))
  }

  if (lowStockOnly) {
    conditions.push(lte(products.currentStock, products.minimumStock))
  }

  const list = await db
    .select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      currentStock: products.currentStock,
      minimumStock: products.minimumStock,
      maximumStock: products.maximumStock,
      unit: products.unit,
      active: products.active,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.id))

  return { products: list }
})
