import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { users } from '../../database/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const db = await useDb()

  const list = await db.query.users.findMany({
    orderBy: [desc(users.id)],
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return { users: list }
})
