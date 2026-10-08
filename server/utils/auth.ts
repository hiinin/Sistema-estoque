import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { users } from '../database/schema'
import { useDb } from './db'

const COOKIE_NAME = 'auth_session'
const SECRET_KEY = new TextEncoder().encode(
  process.env.NUXT_SESSION_SECRET || 'super-secret-session-key-sistema-estoque-2026-xyz-32chars'
)

export interface SessionPayload {
  id: number
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR'
}

/**
 * Cria o cookie de sessão seguro (HttpOnly, SameSite)
 */
export async function createUserSession(event: H3Event, user: SessionPayload) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY)

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/'
  })

  return token
}

/**
 * Obtém os dados da sessão a partir do cookie verificado
 */
export async function getUserSession(event: H3Event): Promise<SessionPayload | null> {
  const cookie = getCookie(event, COOKIE_NAME)
  if (!cookie) return null

  try {
    const { payload } = await jwtVerify(cookie, SECRET_KEY)
    return {
      id: Number(payload.id),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as 'ADMIN' | 'MANAGER' | 'OPERATOR'
    }
  } catch {
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return null
  }
}

/**
 * Limpa o cookie de sessão
 */
export function clearUserSession(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/**
 * Exige que o usuário esteja autenticado, senão lança 401
 */
export async function requireAuth(event: H3Event): Promise<SessionPayload> {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Não autenticado',
      message: 'Você precisa estar autenticado para acessar este recurso.'
    })
  }

  // Verifica se o usuário ainda está ativo no banco
  const db = await useDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id)
  })

  if (!user || !user.active) {
    clearUserSession(event)
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuário inativo ou não encontrado',
      message: 'Sua conta foi desativada ou não existe mais.'
    })
  }

  return session
}

/**
 * Exige que o usuário possua uma das roles permitidas, senão lança 403
 */
export async function requireRole(
  event: H3Event,
  allowedRoles: ('ADMIN' | 'MANAGER' | 'OPERATOR')[]
): Promise<SessionPayload> {
  const user = await requireAuth(event)
  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acesso negado',
      message: 'Você não tem permissão para realizar esta operação.'
    })
  }
  return user
}
