import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { categories, products } from '../../database/schema'
import { desc, ilike, and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const query = getQuery(event)
  const search = query.q ? String(query.q).trim() : ''
  const activeParam = query.active

  const db = await useDb()

  const conditions = []
  if (search) {
    conditions.push(ilike(categories.name, `%${search}%`))
  }
  if (activeParam === 'true') {
    conditions.push(eq(categories.active, true))
  } else if (activeParam === 'false') {
    conditions.push(eq(categories.active, false))
  }

  // Busca categorias junto com a contagem de produtos vinculados
  const list = await db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      active: categories.active,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      productsCount: sql<number>`count(${products.id})::int`
    })
    .from(categories)
    .leftJoin(products, eq(categories.id, products.categoryId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(categories.id)
    .orderBy(desc(categories.id))

  return { categories: list }
})
