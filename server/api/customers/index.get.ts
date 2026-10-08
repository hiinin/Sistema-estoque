import { desc, ilike, or } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { customers } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const db = await useDb()

  const list = await db.query.customers.findMany({
    where: search
      ? or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.cpf, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.email, `%${search}%`)
        )
      : undefined,
    orderBy: [desc(customers.createdAt)]
  })

  return { customers: list }
})
