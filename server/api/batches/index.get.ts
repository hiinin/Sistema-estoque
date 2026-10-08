import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { productBatches, products } from '../../database/schema'
import { desc, asc, and, eq, ilike, or, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)

  const search = query.q ? String(query.q).trim() : ''
  const statusFilter = query.status ? String(query.status).trim() : 'ALL'
  const productId = query.product_id ? Number(query.product_id) : undefined

  const db = await useDb()

  const today = new Date().toISOString().split('T')[0]

  const conditions = []

  if (productId) {
    conditions.push(eq(productBatches.productId, productId))
  }

  if (search) {
    conditions.push(
      or(
        ilike(productBatches.batchNumber, `%${search}%`),
        ilike(products.name, `%${search}%`),
        ilike(products.barcode, `%${search}%`),
        ilike(products.sku, `%${search}%`)
      )
    )
  }

  // Busca lotes com informações do produto e cálculo de dias restantes para vencimento
  const list = await db
    .select({
      id: productBatches.id,
      productId: productBatches.productId,
      productName: products.name,
      productBarcode: products.barcode,
      productSku: products.sku,
      productUnit: products.unit,
      batchNumber: productBatches.batchNumber,
      initialQuantity: productBatches.initialQuantity,
      currentQuantity: productBatches.currentQuantity,
      costPrice: productBatches.costPrice,
      manufacturingDate: productBatches.manufacturingDate,
      expirationDate: productBatches.expirationDate,
      active: productBatches.active,
      createdAt: productBatches.createdAt,
      daysToExpiration: sql<number>`(DATE(${productBatches.expirationDate}) - CURRENT_DATE)::int`
    })
    .from(productBatches)
    .innerJoin(products, eq(productBatches.productId, products.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(productBatches.expirationDate))

  // Mapeia os status de validade calculados segundo a regra do projeto
  const enhancedList = list.map((b) => {
    let status: 'EXPIRED' | 'EXPIRING_7_DAYS' | 'EXPIRING_30_DAYS' | 'OK'
    let statusLabel: string
    let statusBadgeColor: string

    if (b.daysToExpiration < 0) {
      status = 'EXPIRED'
      statusLabel = `Vencido há ${Math.abs(b.daysToExpiration)} dia(s)`
      statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200'
    } else if (b.daysToExpiration === 0) {
      status = 'EXPIRED'
      statusLabel = 'Vence hoje!'
      statusBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200'
    } else if (b.daysToExpiration <= 7) {
      status = 'EXPIRING_7_DAYS'
      statusLabel = `Vence em ${b.daysToExpiration} dia(s)`
      statusBadgeColor = 'bg-orange-50 text-orange-700 border-orange-200'
    } else if (b.daysToExpiration <= 30) {
      status = 'EXPIRING_30_DAYS'
      statusLabel = `Vence em ${b.daysToExpiration} dia(s)`
      statusBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200'
    } else {
      status = 'OK'
      statusLabel = `Validade regular (${b.daysToExpiration} dias)`
      statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }

    return {
      ...b,
      status,
      statusLabel,
      statusBadgeColor
    }
  })

  // Filtragem pós-cálculo por status se solicitado
  const filteredList =
    statusFilter === 'ALL'
      ? enhancedList
      : enhancedList.filter((b) => b.status === statusFilter)

  // Resumo de contadores para cards da UI
  const summary = {
    total: enhancedList.length,
    expired: enhancedList.filter((b) => b.status === 'EXPIRED').length,
    expiring7Days: enhancedList.filter((b) => b.status === 'EXPIRING_7_DAYS').length,
    expiring30Days: enhancedList.filter((b) => b.status === 'EXPIRING_30_DAYS').length,
    regular: enhancedList.filter((b) => b.status === 'OK').length
  }

  return {
    batches: filteredList,
    summary
  }
})
