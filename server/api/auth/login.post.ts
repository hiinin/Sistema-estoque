import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { useDb } from '../../utils/db'
import { createUserSession } from '../../utils/auth'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória')
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validation = loginSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: {
        errors: validation.error.flatten().fieldErrors
      }
    })
  }

  const { email, password } = validation.data
  const db = await useDb()

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim())
  })

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenciais inválidas',
      message: 'E-mail ou senha incorretos.'
    })
  }

  if (!user.active) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Conta inativa',
      message: 'Este usuário está inativo. Entre em contato com o administrador.'
    })
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Credenciais inválidas',
      message: 'E-mail ou senha incorretos.'
    })
  }

  const sessionData = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'ADMIN' | 'MANAGER' | 'OPERATOR'
  }

  await createUserSession(event, sessionData)

  return {
    message: 'Login realizado com sucesso',
    user: sessionData
  }
})
