import { sql, eq, and, gte, lte, desc } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import {
  sales,
  saleItems,
  products,
  productBatches,
  stockMovements,
  categories,
  users,
  customers
} from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const db = await useDb()

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0] // 'YYYY-MM-DD'
  const startOfToday = `${todayStr}T00:00:00.000Z`
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`

  // 7 dias atrás
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  // Datas para validade
  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  const in30Days = new Date(now)
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().split('T')[0]

  // 1. Carregar todas as vendas ativas para agregações precisas
  const allCompletedSales = await db.query.sales.findMany({
    where: eq(sales.status, 'COMPLETED'),
    orderBy: [desc(sales.createdAt)],
    with: {
      user: { columns: { id: true, name: true } },
      customer: true,
      items: {
        with: {
          product: { columns: { id: true, name: true, sku: true, categoryId: true } }
        }
      }
    }
  })

  // 2. Carregar produtos
  const allProducts = await db.query.products.findMany({
    where: eq(products.active, true),
    with: {
      category: true
    }
  })

  // 3. Carregar lotes ativos
  const allBatches = await db.query.productBatches.findMany({
    where: eq(productBatches.active, true),
    with: {
      product: { columns: { id: true, name: true } }
    }
  })

  // 4. Carregar últimas movimentações de estoque
  const recentMovements = await db.query.stockMovements.findMany({
    limit: 6,
    orderBy: [desc(stockMovements.createdAt)],
    with: {
      product: { columns: { id: true, name: true, unit: true } },
      user: { columns: { id: true, name: true } }
    }
  })

  // --- CÁLCULOS DE VENDAS ---
  const todaySales = allCompletedSales.filter((s) => s.createdAt.startsWith(todayStr))
  const monthSales = allCompletedSales.filter((s) => s.createdAt >= startOfMonth)

  const todayRevenue = todaySales.reduce((acc, s) => acc + Number(s.total), 0)
  const todayCount = todaySales.length
  const todayItemsSold = todaySales.reduce((acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + Number(item.quantity), 0), 0)
  const todayAvgTicket = todayCount > 0 ? todayRevenue / todayCount : 0

  const monthRevenue = monthSales.reduce((acc, s) => acc + Number(s.total), 0)
  const monthCount = monthSales.length

  // Lucro bruto estimado do mês
  let monthProfit = 0
  for (const s of monthSales) {
    for (const item of s.items) {
      const saleP = Number(item.unitPrice)
      const costP = Number(item.costPrice || 0)
      const qty = Number(item.quantity)
      monthProfit += (saleP - costP) * qty
    }
  }

  // --- CÁLCULOS DE ESTOQUE ---
  let totalStockCost = 0
  let totalStockSaleValue = 0
  const lowStockProducts: any[] = []

  for (const prod of allProducts) {
    const current = Number(prod.currentStock)
    const min = Number(prod.minimumStock)
    const cost = Number(prod.costPrice)
    const sale = Number(prod.salePrice)

    totalStockCost += current * cost
    totalStockSaleValue += current * sale

    if (current <= min) {
      lowStockProducts.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        currentStock: current,
        minimumStock: min,
        unit: prod.unit,
        categoryName: prod.category?.name || 'Sem Categoria',
        isOutOfStock: current <= 0
      })
    }
  }

  // Ordenar produtos críticos (mais abaixo do mínimo primeiro)
  lowStockProducts.sort((a, b) => a.currentStock - b.currentStock)

  // --- CÁLCULOS DE VALIDADE ---
  let expiredBatchesCount = 0
  let expiring7DaysCount = 0
  let expiring30DaysCount = 0

  for (const b of allBatches) {
    if (Number(b.currentQuantity) <= 0) continue

    const exp = b.expirationDate
    if (exp < todayStr) {
      expiredBatchesCount++
    } else if (exp <= in7DaysStr) {
      expiring7DaysCount++
    } else if (exp <= in30DaysStr) {
      expiring30DaysCount++
    }
  }

  // --- GRÁFICO: VENDAS ÚLTIMOS 7 DIAS ---
  const last7DaysMap = new Map<string, { total: number; count: number; dayLabel: string }>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' })
    last7DaysMap.set(dStr, { total: 0, count: 0, dayLabel })
  }

  for (const s of allCompletedSales) {
    const dStr = s.createdAt.split('T')[0]
    if (last7DaysMap.has(dStr)) {
      const entry = last7DaysMap.get(dStr)!
      entry.total += Number(s.total)
      entry.count += 1
    }
  }

  const chartLast7Days = Array.from(last7DaysMap.entries()).map(([dateStr, data]) => ({
    date: dateStr,
    label: data.dayLabel,
    total: Math.round(data.total * 100) / 100,
    count: data.count
  }))

  // --- FORMAS DE PAGAMENTO ---
  const paymentMethodsMap: Record<string, { label: string; total: number; count: number }> = {
    MONEY: { label: 'Dinheiro', total: 0, count: 0 },
    PIX: { label: 'PIX', total: 0, count: 0 },
    DEBIT_CARD: { label: 'Cartão de Débito', total: 0, count: 0 },
    CREDIT_CARD: { label: 'Cartão de Crédito', total: 0, count: 0 },
    OTHER: { label: 'Outro', total: 0, count: 0 }
  }

  for (const s of monthSales) {
    const method = s.paymentMethod || 'OTHER'
    if (!paymentMethodsMap[method]) {
      paymentMethodsMap[method] = { label: method, total: 0, count: 0 }
    }
    paymentMethodsMap[method].total += Number(s.total)
    paymentMethodsMap[method].count += 1
  }

  const paymentDistribution = Object.entries(paymentMethodsMap)
    .filter(([_, data]) => data.count > 0 || data.total > 0)
    .map(([key, data]) => ({
      key,
      label: data.label,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: monthRevenue > 0 ? Math.round((data.total / monthRevenue) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  // --- TOP 5 PRODUTOS MAIS VENDIDOS ---
  const productSalesMap = new Map<number, { id: number; name: string; sku: string; quantity: number; revenue: number }>()

  for (const s of allCompletedSales) {
    for (const item of s.items) {
      const pId = item.productId
      const current = productSalesMap.get(pId) || {
        id: pId,
        name: item.product?.name || `Produto #${pId}`,
        sku: item.product?.sku || '',
        quantity: 0,
        revenue: 0
      }
      current.quantity += Number(item.quantity)
      current.revenue += Number(item.subtotal)
      productSalesMap.set(pId, current)
    }
  }

  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  // --- VENDAS POR CATEGORIA ---
  const categorySalesMap = new Map<string, { name: string; revenue: number; quantity: number }>()
  const allCategories = await db.query.categories.findMany()
  const catNameById = new Map(allCategories.map(c => [c.id, c.name]))

  for (const s of allCompletedSales) {
    for (const item of s.items) {
      const catId = item.product?.categoryId
      const catName = (catId && catNameById.get(catId)) || 'Geral'
      const current = categorySalesMap.get(catName) || { name: catName, revenue: 0, quantity: 0 }
      current.revenue += Number(item.subtotal)
      current.quantity += Number(item.quantity)
      categorySalesMap.set(catName, current)
    }
  }

  const categoryDistribution = Array.from(categorySalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)

  // --- ÚLTIMAS 5 VENDAS ---
  const recentSales = allCompletedSales.slice(0, 5).map(s => ({
    id: s.id,
    code: s.code,
    total: Number(s.total),
    paymentMethod: s.paymentMethod,
    itemsCount: s.items.length,
    userName: s.user?.name || 'Operador',
    customerName: s.customer?.name || 'Cliente Balcão',
    createdAt: s.createdAt
  }))

  return {
    metrics: {
      today: {
        revenue: todayRevenue,
        count: todayCount,
        itemsSold: todayItemsSold,
        avgTicket: todayAvgTicket
      },
      month: {
        revenue: monthRevenue,
        count: monthCount,
        estimatedProfit: monthProfit
      },
      stock: {
        totalProducts: allProducts.length,
        lowStockCount: lowStockProducts.length,
        totalCost: totalStockCost,
        totalSaleValue: totalStockSaleValue,
        potentialMargin: totalStockCost > 0 ? ((totalStockSaleValue - totalStockCost) / totalStockCost) * 100 : 0
      },
      expiration: {
        expiredCount: expiredBatchesCount,
        expiring7DaysCount: expiring7DaysCount,
        expiring30DaysCount: expiring30DaysCount,
        totalAttention: expiredBatchesCount + expiring7DaysCount + expiring30DaysCount
      }
    },
    charts: {
      last7Days: chartLast7Days,
      paymentDistribution,
      topProducts,
      categoryDistribution
    },
    lowStockAlerts: lowStockProducts.slice(0, 6),
    recentSales,
    recentMovements: recentMovements.map(m => ({
      id: m.id,
      type: m.type,
      productName: m.product?.name || `Produto #${m.productId}`,
      unit: m.product?.unit || 'UN',
      quantity: Number(m.quantity),
      previousStock: Number(m.previousStock),
      newStock: Number(m.newStock),
      userName: m.user?.name || 'Sistema',
      reason: m.reason,
      createdAt: m.createdAt
    }))
  }
})
