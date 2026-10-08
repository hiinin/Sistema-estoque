import { desc, eq, and, gte, lte } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sales, saleItems, products, users, customers } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const startDate = typeof query.startDate === 'string' && query.startDate ? `${query.startDate}T00:00:00.000Z` : undefined
  const endDate = typeof query.endDate === 'string' && query.endDate ? `${query.endDate}T23:59:59.999Z` : undefined
  const paymentMethod = typeof query.paymentMethod === 'string' && query.paymentMethod ? query.paymentMethod : undefined
  const status = typeof query.status === 'string' && query.status ? query.status : undefined
  const userId = query.userId ? Number(query.userId) : undefined
  const customerId = query.customerId ? Number(query.customerId) : undefined

  const db = await useDb()

  const allSales = await db.query.sales.findMany({
    orderBy: [desc(sales.createdAt)],
    with: {
      user: { columns: { id: true, name: true, email: true } },
      customer: true,
      items: {
        with: {
          product: { columns: { id: true, name: true, sku: true, barcode: true, unit: true } }
        }
      }
    }
  })

  // Aplicar filtros em memória com segurança de tipagem
  const filteredSales = allSales.filter((s) => {
    if (startDate && s.createdAt < startDate) return false
    if (endDate && s.createdAt > endDate) return false
    if (paymentMethod && s.paymentMethod !== paymentMethod) return false
    if (status && status !== 'ALL' && s.status !== status) return false
    if (userId && s.userId !== userId) return false
    if (customerId && s.customerId !== customerId) return false
    return true
  })

  // Agregações
  const completedSales = filteredSales.filter(s => s.status === 'COMPLETED')
  const cancelledSales = filteredSales.filter(s => s.status === 'CANCELLED')

  const totalGross = completedSales.reduce((acc, s) => acc + Number(s.subtotal), 0)
  const totalDiscounts = completedSales.reduce((acc, s) => acc + Number(s.discount), 0)
  const totalNet = completedSales.reduce((acc, s) => acc + Number(s.total), 0)
  const totalItems = completedSales.reduce((acc, s) => acc + s.items.reduce((iAcc, item) => iAcc + Number(item.quantity), 0), 0)
  const avgTicket = completedSales.length > 0 ? totalNet / completedSales.length : 0

  // Lucro bruto estimado
  let totalProfit = 0
  for (const s of completedSales) {
    for (const item of s.items) {
      const uPrice = Number(item.unitPrice)
      const cPrice = Number(item.costPrice || 0)
      const qty = Number(item.quantity)
      totalProfit += (uPrice - cPrice) * qty
    }
  }

  // Distribuição por método de pagamento
  const paymentSummary: Record<string, { label: string; count: number; total: number }> = {
    MONEY: { label: 'Dinheiro', count: 0, total: 0 },
    PIX: { label: 'PIX', count: 0, total: 0 },
    DEBIT_CARD: { label: 'Cartão de Débito', count: 0, total: 0 },
    CREDIT_CARD: { label: 'Cartão de Crédito', count: 0, total: 0 }
  }

  for (const s of completedSales) {
    const m = s.paymentMethod || 'MONEY'
    if (!paymentSummary[m]) {
      paymentSummary[m] = { label: m, count: 0, total: 0 }
    }
    paymentSummary[m].count += 1
    paymentSummary[m].total += Number(s.total)
  }

  return {
    summary: {
      totalGross,
      totalDiscounts,
      totalNet,
      totalProfit,
      salesCount: completedSales.length,
      cancelledCount: cancelledSales.length,
      totalItems,
      avgTicket
    },
    paymentSummary: Object.entries(paymentSummary).map(([key, val]) => ({
      key,
      label: val.label,
      count: val.count,
      total: Math.round(val.total * 100) / 100
    })),
    sales: filteredSales.map(s => ({
      id: s.id,
      code: s.code,
      customerName: s.customer?.name || 'Consumidor Final',
      userName: s.user?.name || 'Operador',
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      total: Number(s.total),
      paymentMethod: s.paymentMethod,
      status: s.status,
      notes: s.notes,
      createdAt: s.createdAt,
      items: s.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || `Produto #${item.productId}`,
        sku: item.product?.sku || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice || 0),
        subtotal: Number(item.subtotal)
      }))
    }))
  }
})
