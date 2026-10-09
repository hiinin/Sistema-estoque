import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { cashRegisters, cashMovements } from '../../database/schema'

const closeRegisterSchema = z.object({
  closingAmount: z.coerce.number().min(0, 'Valor em dinheiro apurado não pode ser negativo'),
  notes: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const body = await readBody(event)
  const validation = closeRegisterSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { closingAmount, notes } = validation.data
  const db = await useDb()

  const openRegister = await db.query.cashRegisters.findFirst({
    where: eq(cashRegisters.status, 'OPEN'),
    with: {
      movements: true
    }
  })

  if (!openRegister) {
    throw createError({
      statusCode: 400,
      message: 'Não há sessão de caixa aberta para fechar.'
    })
  }

  // Calcula valores apurados
  const openingAmount = Number(openRegister.openingAmount) || 0
  let totalCashSales = 0
  let totalPixSales = 0
  let totalDebitSales = 0
  let totalCreditSales = 0
  let totalBleeds = 0
  let totalReinforcements = 0

  for (const mov of openRegister.movements) {
    const amount = Number(mov.amount) || 0
    if (mov.type === 'SALE') {
      if (mov.paymentMethod === 'MONEY') totalCashSales += amount
      else if (mov.paymentMethod === 'PIX') totalPixSales += amount
      else if (mov.paymentMethod === 'DEBIT_CARD') totalDebitSales += amount
      else if (mov.paymentMethod === 'CREDIT_CARD') totalCreditSales += amount
    } else if (mov.type === 'BLEED') {
      totalBleeds += amount
    } else if (mov.type === 'REINFORCEMENT') {
      totalReinforcements += amount
    }
  }

  // Dinheiro esperado na gaveta
  const expectedAmount = openingAmount + totalCashSales + totalReinforcements - totalBleeds
  const differenceAmount = closingAmount - expectedAmount

  const result = await db.transaction(async (tx) => {
    // 1. Atualizar registro do caixa
    const [updated] = await tx
      .update(cashRegisters)
      .set({
        status: 'CLOSED',
        closingAmount: closingAmount.toFixed(2),
        expectedAmount: expectedAmount.toFixed(2),
        differenceAmount: differenceAmount.toFixed(2),
        notes: notes?.trim() || openRegister.notes || null,
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(cashRegisters.id, openRegister.id))
      .returning()

    // 2. Registrar movimento de fechamento
    await tx.insert(cashMovements).values({
      cashRegisterId: openRegister.id,
      userId: session.id,
      type: 'CLOSING',
      amount: closingAmount.toFixed(2),
      paymentMethod: 'MONEY',
      description: `Fechamento de caixa por ${session.name}. Esperado: R$ ${expectedAmount.toFixed(2)} | Apurado: R$ ${closingAmount.toFixed(2)} | Diferença: R$ ${differenceAmount.toFixed(2)}`
    })

    return updated
  })

  return {
    message: 'Caixa fechado com sucesso!',
    register: result,
    summary: {
      openingAmount,
      expectedAmount,
      closingAmount,
      differenceAmount,
      totalCashSales,
      totalPixSales,
      totalDebitSales,
      totalCreditSales,
      totalBleeds,
      totalReinforcements,
      totalRevenue: totalCashSales + totalPixSales + totalDebitSales + totalCreditSales
    }
  }
})
