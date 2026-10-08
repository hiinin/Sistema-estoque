import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { suppliers, products, purchases } from '../../database/schema'
import { desc, ilike, or, and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const search = query.q ? String(query.q).trim() : ''
  const activeParam = query.active

  const db = await useDb()

  const conditions = []
  if (search) {
    conditions.push(
      or(
        ilike(suppliers.name, `%${search}%`),
        ilike(suppliers.cnpj, `%${search}%`),
        ilike(suppliers.email, `%${search}%`),
        ilike(suppliers.phone, `%${search}%`)
      )
    )
  }

  if (activeParam === 'true') {
    conditions.push(eq(suppliers.active, true))
  } else if (activeParam === 'false') {
    conditions.push(eq(suppliers.active, false))
  }

  // Lista fornecedores com contagem de produtos e compras associadas
  const list = await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      cnpj: suppliers.cnpj,
      phone: suppliers.phone,
      email: suppliers.email,
      address: suppliers.address,
      active: suppliers.active,
      createdAt: suppliers.createdAt,
      updatedAt: suppliers.updatedAt,
      productsCount: sql<number>`count(distinct ${products.id})::int`,
      purchasesCount: sql<number>`count(distinct ${purchases.id})::int`
    })
    .from(suppliers)
    .leftJoin(products, eq(suppliers.id, products.supplierId))
    .leftJoin(purchases, eq(suppliers.id, purchases.supplierId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(suppliers.id)
    .orderBy(desc(suppliers.id))

  return { suppliers: list }
})
