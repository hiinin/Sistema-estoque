import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { cashRegisters, cashMovements } from '../../database/schema'

const openRegisterSchema = z.object({
  openingAmount: z.coerce.number().min(0, 'Valor de abertura não pode ser negativo').default(0),
  notes: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const body = await readBody(event)
  const validation = openRegisterSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { openingAmount, notes } = validation.data
  const db = await useDb()

  // Verifica se já existe um caixa aberto
  const existingOpen = await db.query.cashRegisters.findFirst({
    where: eq(cashRegisters.status, 'OPEN')
  })

  if (existingOpen) {
    throw createError({
      statusCode: 400,
      message: `Já existe um caixa aberto no momento (Sessão #${existingOpen.id}). Feche o caixa anterior antes de abrir um novo.`
    })
  }

  const result = await db.transaction(async (tx) => {
    // 1. Criar registro de abertura de caixa
    const [register] = await tx
      .insert(cashRegisters)
      .values({
        userId: session.id,
        status: 'OPEN',
        openingAmount: openingAmount.toFixed(2),
        notes: notes?.trim() || null,
        openedAt: new Date().toISOString()
      })
      .returning()

    // 2. Criar movimento de abertura
    await tx.insert(cashMovements).values({
      cashRegisterId: register.id,
      userId: session.id,
      type: 'OPENING',
      amount: openingAmount.toFixed(2),
      paymentMethod: 'MONEY',
      description: `Abertura de caixa com fundo inicial de R$ ${openingAmount.toFixed(2)}`
    })

    return register
  })

  return {
    message: 'Caixa aberto com sucesso!',
    register: result
  }
})
