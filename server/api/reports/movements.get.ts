import { desc, eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { stockMovements, products, users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const startDate = typeof query.startDate === 'string' && query.startDate ? `${query.startDate}T00:00:00.000Z` : undefined
  const endDate = typeof query.endDate === 'string' && query.endDate ? `${query.endDate}T23:59:59.999Z` : undefined
  const type = typeof query.type === 'string' && query.type !== 'ALL' ? query.type : undefined
  const productId = query.productId ? Number(query.productId) : undefined
  const userId = query.userId ? Number(query.userId) : undefined

  const db = await useDb()

  const allMovements = await db.query.stockMovements.findMany({
    orderBy: [desc(stockMovements.createdAt)],
    with: {
      product: {
        columns: { id: true, name: true, sku: true, barcode: true, unit: true }
      },
      user: {
        columns: { id: true, name: true, email: true }
      }
    }
  })

  const filtered = allMovements.filter((m) => {
    if (startDate && m.createdAt < startDate) return false
    if (endDate && m.createdAt > endDate) return false
    if (type && m.type !== type) return false
    if (productId && m.productId !== productId) return false
    if (userId && m.userId !== userId) return false
    return true
  })

  // Agregações por tipo
  const summary = {
    totalMovements: filtered.length,
    entriesCount: filtered.filter(m => m.type === 'ENTRY' || m.type === 'PURCHASE' || m.type === 'RETURN').length,
    salesCount: filtered.filter(m => m.type === 'SALE').length,
    lossesCount: filtered.filter(m => m.type === 'LOSS').length,
    adjustmentsCount: filtered.filter(m => m.type === 'ADJUSTMENT').length
  }

  return {
    summary,
    movements: filtered.map(m => ({
      id: m.id,
      type: m.type,
      productId: m.productId,
      productName: m.product?.name || `Produto #${m.productId}`,
      sku: m.product?.sku || '',
      barcode: m.product?.barcode || '',
      unit: m.product?.unit || 'UN',
      quantity: Number(m.quantity),
      previousStock: Number(m.previousStock),
      newStock: Number(m.newStock),
      unitCost: Number(m.unitCost || 0),
      referenceId: m.referenceId,
      reason: m.reason,
      userName: m.user?.name || 'Sistema',
      createdAt: m.createdAt
    }))
  }
})
