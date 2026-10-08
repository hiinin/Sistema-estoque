import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sales, saleItems, users, customers, products } from '../../database/schema'
import { desc, and, eq, gte, lte, ilike, or, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const query = getQuery(event)

  const search = query.q ? String(query.q).trim() : ''
  const paymentMethod = query.payment_method ? String(query.payment_method).trim() : undefined
  const status = query.status ? String(query.status).trim() : undefined
  const startDate = query.start_date ? String(query.start_date) : undefined
  const endDate = query.end_date ? String(query.end_date) : undefined

  const db = await useDb()

  const conditions = []

  if (status && status !== 'ALL') {
    conditions.push(eq(sales.status, status))
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    conditions.push(eq(sales.paymentMethod, paymentMethod))
  }

  if (startDate) {
    conditions.push(gte(sales.createdAt, startDate))
  }

  if (endDate) {
    conditions.push(lte(sales.createdAt, endDate + ' 23:59:59'))
  }

  if (search) {
    conditions.push(
      or(
        ilike(sales.code, `%${search}%`),
        ilike(customers.name, `%${search}%`),
        ilike(customers.cpf, `%${search}%`)
      )
    )
  }

  const list = await db
    .select({
      id: sales.id,
      code: sales.code,
      userId: sales.userId,
      userName: users.name,
      customerId: sales.customerId,
      customerName: customers.name,
      subtotal: sales.subtotal,
      discount: sales.discount,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      notes: sales.notes,
      createdAt: sales.createdAt,
      itemsCount: sql<number>`count(${saleItems.id})::int`
    })
    .from(sales)
    .innerJoin(users, eq(sales.userId, users.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(sales.id, users.name, customers.name)
    .orderBy(desc(sales.createdAt))
    .limit(100)

  return { sales: list }
})
