import { desc, eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, suppliers } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined
  const supplierId = query.supplierId ? Number(query.supplierId) : undefined
  const status = typeof query.status === 'string' ? query.status : 'ALL'
  const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : ''

  const db = await useDb()

  const allProducts = await db.query.products.findMany({
    where: eq(products.active, true),
    orderBy: [desc(products.createdAt)],
    with: {
      category: true,
      supplier: true
    }
  })

  const filtered = allProducts.filter((p) => {
    const current = Number(p.currentStock)
    const min = Number(p.minimumStock)

    if (categoryId && p.categoryId !== categoryId) return false
    if (supplierId && p.supplierId !== supplierId) return false

    if (status === 'LOW' && (current > min || current <= 0)) return false
    if (status === 'OUT_OF_STOCK' && current > 0) return false
    if (status === 'NORMAL' && current <= min) return false

    if (search) {
      const matchName = p.name.toLowerCase().includes(search)
      const matchSku = p.sku.toLowerCase().includes(search)
      const matchBarcode = p.barcode.toLowerCase().includes(search)
      if (!matchName && !matchSku && !matchBarcode) return false
    }

    return true
  })

  // Cálculos consolidados
  let totalCostValue = 0
  let totalSaleValue = 0
  let totalUnits = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  const items = filtered.map((p) => {
    const current = Number(p.currentStock)
    const min = Number(p.minimumStock)
    const cost = Number(p.costPrice)
    const sale = Number(p.salePrice)
    const subtotalCost = current * cost
    const subtotalSale = current * sale
    const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 0
    const suggestedBuy = current < min ? min * 2 - current : 0

    totalCostValue += subtotalCost
    totalSaleValue += subtotalSale
    totalUnits += current

    if (current <= 0) outOfStockCount++
    else if (current <= min) lowStockCount++

    let stockStatus: 'OUT_OF_STOCK' | 'LOW' | 'NORMAL' = 'NORMAL'
    if (current <= 0) stockStatus = 'OUT_OF_STOCK'
    else if (current <= min) stockStatus = 'LOW'

    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      categoryName: p.category?.name || 'Sem categoria',
      supplierName: p.supplier?.name || 'Sem fornecedor',
      unit: p.unit,
      costPrice: cost,
      salePrice: sale,
      currentStock: current,
      minimumStock: min,
      maximumStock: Number(p.maximumStock),
      subtotalCost: Math.round(subtotalCost * 100) / 100,
      subtotalSale: Math.round(subtotalSale * 100) / 100,
      margin: Math.round(margin * 10) / 10,
      stockStatus,
      suggestedBuy: Math.max(0, Math.round(suggestedBuy * 100) / 100)
    }
  })

  return {
    summary: {
      totalProducts: filtered.length,
      totalUnits: Math.round(totalUnits * 100) / 100,
      totalCostValue: Math.round(totalCostValue * 100) / 100,
      totalSaleValue: Math.round(totalSaleValue * 100) / 100,
      potentialProfit: Math.round((totalSaleValue - totalCostValue) * 100) / 100,
      lowStockCount,
      outOfStockCount
    },
    products: items
  }
})
