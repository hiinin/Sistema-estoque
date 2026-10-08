import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { sales, saleItems, products, users, customers } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, id),
    with: {
      user: {
        columns: { id: true, name: true, email: true }
      },
      customer: true,
      items: {
        with: {
          product: true,
          batch: true
        }
      }
    }
  })

  if (!sale) {
    throw createError({ statusCode: 404, message: 'Venda não encontrada' })
  }

  return { sale }
})
