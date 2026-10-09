import { desc, eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { cashRegisters } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 100)
  const status = query.status as string | undefined

  const db = await useDb()

  const list = await db.query.cashRegisters.findMany({
    where: status ? eq(cashRegisters.status, status) : undefined,
    orderBy: [desc(cashRegisters.openedAt)],
    limit,
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      movements: {
        orderBy: [desc(cashRegisters.openedAt)]
      }
    }
  })

  return {
    cashRegisters: list
  }
})
