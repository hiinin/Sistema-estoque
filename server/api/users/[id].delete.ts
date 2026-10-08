import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  if (session.id === id) {
    throw createError({
      statusCode: 400,
      message: 'Você não pode excluir sua própria conta.'
    })
  }

  const db = await useDb()
  const existing = await db.query.users.findFirst({
    where: eq(users.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  // Soft-delete alternando active para false para manter integridade de histórico em vendas/compras
  await db.update(users).set({ active: false }).where(eq(users.id, id))

  return {
    message: 'Usuário desativado com sucesso'
  }
})
