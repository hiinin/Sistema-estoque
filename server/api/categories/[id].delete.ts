import { eq, sql } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { categories, products } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  // 1. Verificar se a categoria existe
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, id)
  })

  if (!category) {
    throw createError({ statusCode: 404, message: 'Categoria não encontrada' })
  }

  // 2. REGRA DE NEGÓCIO CRÍTICA: Não permitir excluir se houver produtos vinculados
  const [productCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, id))

  const productCount = productCountResult?.count || 0

  if (productCount > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Operação não permitida',
      message: `Não é possível excluir a categoria "${category.name}" pois existem ${productCount} produto(s) vinculado(s) a ela. Realoque ou remova os produtos antes de excluir a categoria.`
    })
  }

  // 3. Excluir a categoria
  await db.delete(categories).where(eq(categories.id, id))

  return {
    message: `Categoria "${category.name}" excluída com sucesso.`
  }
})
