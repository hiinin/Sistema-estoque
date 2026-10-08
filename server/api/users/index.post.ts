import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { users } from '../../database/schema'

const createUserSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'OPERATOR'], {
    message: 'Perfil deve ser ADMIN, MANAGER ou OPERATOR'
  }),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const body = await readBody(event)
  const validation = createUserSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // Verificar se o e-mail já existe
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase().trim())
  })

  if (existing) {
    throw createError({
      statusCode: 422,
      statusMessage: 'E-mail já cadastrado',
      data: { errors: { email: ['Este e-mail já está em uso por outro usuário.'] } }
    })
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)
  const [created] = await db.insert(users).values({
    name: data.name,
    email: data.email.toLowerCase().trim(),
    password: hashedPassword,
    role: data.role,
    active: data.active
  }).returning({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt
  })

  return {
    message: 'Usuário cadastrado com sucesso',
    user: created
  }
})
