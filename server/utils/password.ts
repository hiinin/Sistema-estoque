import { z } from 'zod'

/** Política de senha: mínimo 8 caracteres, com letra e número. */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra')
  .regex(/\d/, 'A senha deve conter ao menos um número')

export const BCRYPT_ROUNDS = 12
