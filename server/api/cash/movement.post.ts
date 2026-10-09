import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { cashRegisters, cashMovements } from '../../database/schema'

const movementSchema = z.object({
  type: z.enum(['BLEED', 'REINFORCEMENT'], {
    message: 'Tipo deve ser Sangria (BLEED) ou Suprimento (REINFORCEMENT)'
  }),
  amount: z.coerce.number().positive('O valor deve ser maior que zero'),
  description: z.string().min(3, 'A justificativa é obrigatória (mínimo 3 caracteres)')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const body = await readBody(event)
  const validation = movementSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { type, amount, description } = validation.data
  const db = await useDb()

  // Busca caixa aberto
  const openRegister = await db.query.cashRegisters.findFirst({
    where: eq(cashRegisters.status, 'OPEN'),
    with: {
      movements: true
    }
  })

  if (!openRegister) {
    throw createError({
      statusCode: 400,
      message: 'Não há nenhum caixa aberto no momento para realizar sangria ou suprimento.'
    })
  }

  // Se for Sangria, verificar se há saldo físico suficiente na gaveta
  if (type === 'BLEED') {
    const opening = Number(openRegister.openingAmount) || 0
    let currentCash = opening
    for (const m of openRegister.movements) {
      const val = Number(m.amount) || 0
      if (m.type === 'SALE' && m.paymentMethod === 'MONEY') currentCash += val
      else if (m.type === 'REINFORCEMENT') currentCash += val
      else if (m.type === 'BLEED') currentCash -= val
    }

    if (amount > currentCash) {
      throw createError({
        statusCode: 400,
        message: `Saldo físico em dinheiro insuficiente para sangria. Saldo na gaveta: R$ ${currentCash.toFixed(2)}, valor solicitado: R$ ${amount.toFixed(2)}.`
      })
    }
  }

  const [movement] = await db
    .insert(cashMovements)
    .values({
      cashRegisterId: openRegister.id,
      userId: session.id,
      type,
      amount: amount.toFixed(2),
      paymentMethod: 'MONEY',
      description: description.trim()
    })
    .returning()

  const typeLabel = type === 'BLEED' ? 'Sangria de Caixa' : 'Suprimento de Caixa'

  return {
    message: `${typeLabel} no valor de R$ ${amount.toFixed(2)} registrada com sucesso!`,
    movement
  }
})
