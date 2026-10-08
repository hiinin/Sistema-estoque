import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq, and, ne } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { users } from '../../database/schema'

const updateUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR']),
  active: z.boolean()
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const body = await readBody(event)
  const validation = updateUserSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Usuário não encontrado' })
  }

  // Verificar se outro usuário já usa esse e-mail
  const duplicate = await db.query.users.findFirst({
    where: and(
      eq(users.email, data.email.toLowerCase().trim()),
      ne(users.id, id)
    )
  })

  if (duplicate) {
    throw createError({
      statusCode: 422,
      statusMessage: 'E-mail já cadastrado',
      data: { errors: { email: ['Este e-mail já está em uso por outro usuário.'] } }
    })
  }

  // Prevenir que o admin logado desative a si próprio ou remova seu próprio perfil ADMIN
  if (session.id === id && (!data.active || data.role !== 'ADMIN')) {
    throw createError({
      statusCode: 400,
      message: 'Você não pode desativar seu próprio usuário nem remover seu perfil de administrador.'
    })
  }

  const updateValues: Partial<typeof users.$inferInsert> = {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    role: data.role,
    active: data.active,
    updatedAt: new Date().toISOString()
  }

  if (data.password && data.password.trim() !== '') {
    updateValues.password = await bcrypt.hash(data.password, 10)
  }

  const [updated] = await db
    .update(users)
    .set(updateValues)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      updatedAt: users.updatedAt
    })

  return {
    message: 'Usuário atualizado com sucesso',
    user: updated
  }
})
