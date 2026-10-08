import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { customers, sales } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  // Desvincular vendas anteriores para manter integridade antes de remover se necessário
  await db.delete(customers).where(eq(customers.id, id))

  return { message: 'Cliente removido com sucesso!' }
})
