import { eq, desc, and } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { cashRegisters, cashMovements, users } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const db = await useDb()

  // Busca sessão de caixa aberta
  const openRegister = await db.query.cashRegisters.findFirst({
    where: eq(cashRegisters.status, 'OPEN'),
    orderBy: [desc(cashRegisters.openedAt)],
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      movements: {
        orderBy: [desc(cashMovements.createdAt)]
      }
    }
  })

  if (!openRegister) {
    return {
      isOpen: false,
      register: null,
      summary: null
    }
  }

  // Calcula balanço atual e totais por meio de pagamento
  const openingAmount = Number(openRegister.openingAmount) || 0
  let totalCashSales = 0
  let totalPixSales = 0
  let totalDebitSales = 0
  let totalCreditSales = 0
  let totalBleeds = 0 // Sangrias
  let totalReinforcements = 0 // Suprimentos

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

  // Dinheiro físico esperado na gaveta = Fundo inicial + Vendas em dinheiro + Suprimentos - Sangrias
  const currentPhysicalCash = openingAmount + totalCashSales + totalReinforcements - totalBleeds
  const totalSalesRevenue = totalCashSales + totalPixSales + totalDebitSales + totalCreditSales

  return {
    isOpen: true,
    register: openRegister,
    summary: {
      openingAmount,
      currentPhysicalCash,
      totalCashSales,
      totalPixSales,
      totalDebitSales,
      totalCreditSales,
      totalBleeds,
      totalReinforcements,
      totalSalesRevenue
    }
  }
})
