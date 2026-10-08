import { eq, desc } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, suppliers, productBatches, stockMovements } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      category: true,
      supplier: true,
      batches: {
        orderBy: [desc(productBatches.expirationDate)]
      },
      movements: {
        orderBy: [desc(stockMovements.createdAt)],
        limit: 15
      }
    }
  })

  if (!product) {
    throw createError({ statusCode: 404, message: 'Produto não encontrado' })
  }

  return { product }
})
