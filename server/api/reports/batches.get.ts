import { desc, eq, and } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { productBatches, products } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : 'ALL'

  const db = await useDb()
  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date(todayStr)

  const in7Days = new Date(today)
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  const allBatches = await db.query.productBatches.findMany({
    where: eq(productBatches.active, true),
    orderBy: [productBatches.expirationDate],
    with: {
      product: {
        columns: { id: true, name: true, sku: true, barcode: true, unit: true }
      }
    }
  })

  let expiredCount = 0
  let expiredValue = 0
  let expiring7Count = 0
  let expiring30Count = 0
  let regularCount = 0

  const items = allBatches.map((b) => {
    const expDate = b.expirationDate
    const qty = Number(b.currentQuantity)
    const cost = Number(b.costPrice || 0)
    const subtotalCost = qty * cost

    const expTime = new Date(expDate).getTime()
    const diffDays = Math.ceil((expTime - today.getTime()) / (1000 * 60 * 60 * 24))

    let batchStatus: 'EXPIRED' | 'EXPIRING_7' | 'EXPIRING_30' | 'REGULAR' = 'REGULAR'
    if (expDate < todayStr) {
      batchStatus = 'EXPIRED'
      expiredCount++
      expiredValue += subtotalCost
    } else if (expDate <= in7DaysStr) {
      batchStatus = 'EXPIRING_7'
      expiring7Count++
    } else if (expDate <= in30DaysStr) {
      batchStatus = 'EXPIRING_30'
      expiring30Count++
    } else {
      regularCount++
    }

    return {
      id: b.id,
      batchNumber: b.batchNumber,
      productId: b.productId,
      productName: b.product?.name || `Produto #${b.productId}`,
      sku: b.product?.sku || '',
      barcode: b.product?.barcode || '',
      unit: b.product?.unit || 'UN',
      initialQuantity: Number(b.initialQuantity),
      currentQuantity: qty,
      costPrice: cost,
      subtotalCost: Math.round(subtotalCost * 100) / 100,
      manufacturingDate: b.manufacturingDate,
      expirationDate: b.expirationDate,
      daysDiff: diffDays,
      status: batchStatus
    }
  })

  const filtered = items.filter((item) => {
    if (status === 'ALL') return true
    return item.status === status
  })

  return {
    summary: {
      totalBatches: allBatches.length,
      expiredCount,
      expiredValue: Math.round(expiredValue * 100) / 100,
      expiring7Count,
      expiring30Count,
      regularCount
    },
    batches: filtered
  }
})
