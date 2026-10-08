import { z } from 'zod'
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

  const [newCustomer] = await db
    .insert(customers)
    .values({
      name: data.name,
      cpf: data.cpf || null,
      phone: data.phone || null,
      email: data.email || null
    })
    .returning()

  return { customer: newCustomer, message: 'Cliente cadastrado com sucesso!' }
})
