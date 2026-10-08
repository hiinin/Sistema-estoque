import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { customers } from '../../database/schema'

const customerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cpf: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const body = await readBody(event)
  const validation = customerSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const [updated] = await db
    .update(customers)
    .set({
      name: data.name,
      cpf: data.cpf || null,
      phone: data.phone || null,
      email: data.email || null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(customers.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Cliente não encontrado' })
  }

  return { customer: updated, message: 'Cliente atualizado com sucesso!' }
})
