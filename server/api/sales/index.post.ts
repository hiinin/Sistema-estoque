import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import {
  sales,
  saleItems,
  products,
  stockMovements,
  customers,
  cashRegisters,
  cashMovements
} from '../../database/schema'

const saleItemInputSchema = z.object({
  productId: z.number().int().positive('Produto inválido'),
  batchId: z.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.coerce.number().min(0, 'Preço unitário inválido')
})

const createSaleSchema = z.object({
  customerId: z.number().int().positive().optional().nullable(),
  discount: z.coerce.number().min(0, 'Desconto não pode ser negativo').default(0),
  paymentMethod: z.enum(['MONEY', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD'], {
    message: 'Forma de pagamento inválida'
  }),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemInputSchema).min(1, 'O carrinho precisa ter ao menos um item')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER', 'OPERATOR'])
  const body = await readBody(event)
  const validation = createSaleSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // TRANSAÇÃO ATÔMICA CRÍTICA DO PDV
  const result = await db.transaction(async (tx) => {
    // 1. Validar cliente se informado
    if (data.customerId) {
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, data.customerId)
      })
      if (!customer) {
        throw createError({ statusCode: 400, message: 'Cliente informado não foi encontrado.' })
      }
    }

    // 2. Pré-validar estoque de todos os itens antes de gravar
    const validatedItems: Array<{
      product: typeof products.$inferSelect
      quantity: number
      unitPrice: number
      costPrice: string
      subtotal: number
      batchId: number | null
    }> = []

    let calculatedSubtotal = 0

    for (const itemInput of data.items) {
      const product = await tx.query.products.findFirst({
        where: eq(products.id, itemInput.productId)
      })

      if (!product) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Produto inexistente',
          message: `Produto com ID ${itemInput.productId} não foi encontrado no sistema.`
        })
      }

      if (!product.active) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Produto inativo',
          message: `O produto "${product.name}" está inativo e não pode ser vendido.`
        })
      }

      const availableStock = Number(product.currentStock)
      const requestedQty = itemInput.quantity

      // REGRA CRÍTICA DE ESTOQUE NEGATIVO (Seção 11)
      if (availableStock < requestedQty) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Estoque insuficiente',
          message: `Não foi possível finalizar a venda. O produto "${product.name}" possui apenas ${availableStock} ${product.unit} disponível(is). Solicitado: ${requestedQty} ${product.unit}.`
        })
      }

      const itemSubtotal = requestedQty * itemInput.unitPrice
      calculatedSubtotal += itemSubtotal

      validatedItems.push({
        product,
        quantity: requestedQty,
        unitPrice: itemInput.unitPrice,
        costPrice: product.costPrice,
        subtotal: itemSubtotal,
        batchId: itemInput.batchId || null
      })
    }

    // 3. Calcular totais
    const discount = Math.min(data.discount, calculatedSubtotal)
    const finalTotal = Math.max(0, calculatedSubtotal - discount)

    // 4. Gerar código único e amigável da venda (ex: VEN-20261008-5432)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const saleCode = `VEN-${todayStr}-${randomSuffix}`

    // 4.1 Buscar sessão de caixa aberta para vincular o lançamento
    const activeRegister = await tx.query.cashRegisters.findFirst({
      where: eq(cashRegisters.status, 'OPEN')
    })

    // 5. Inserir Registro da Venda (sales)
    const [sale] = await tx
      .insert(sales)
      .values({
        code: saleCode,
        userId: session.id,
        cashRegisterId: activeRegister ? activeRegister.id : null,
        customerId: data.customerId || null,
        subtotal: calculatedSubtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: finalTotal.toFixed(2),
        paymentMethod: data.paymentMethod,
        status: 'COMPLETED',
        notes: data.notes?.trim() || null
      })
      .returning()

    // 5.1 Se há caixa aberto, lançar no fluxo financeiro da sessão
    if (activeRegister) {
      await tx.insert(cashMovements).values({
        cashRegisterId: activeRegister.id,
        userId: session.id,
        type: 'SALE',
        amount: finalTotal.toFixed(2),
        paymentMethod: data.paymentMethod,
        description: `Venda ${saleCode} (${data.paymentMethod})`
      })
    }

    // 6. Processar itens, baixar estoque e registrar movimentações de auditoria
    for (const item of validatedItems) {
      const currentStock = Number(item.product.currentStock)
      const newStock = currentStock - item.quantity

      // Inserir item da venda
      await tx.insert(saleItems).values({
        saleId: sale.id,
        productId: item.product.id,
        batchId: item.batchId,
        quantity: item.quantity.toFixed(3),
        unitPrice: item.unitPrice.toFixed(2),
        costPrice: item.costPrice,
        subtotal: item.subtotal.toFixed(2)
      })

      // Baixar estoque do produto
      await tx
        .update(products)
        .set({
          currentStock: newStock.toFixed(3),
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.id, item.product.id))

      // REGRA CRÍTICA: Gravar movimentação correspondente (stock_movements)
      await tx.insert(stockMovements).values({
        productId: item.product.id,
        batchId: item.batchId,
        userId: session.id,
        type: 'SALE',
        quantity: (-item.quantity).toFixed(3),
        previousStock: currentStock.toFixed(3),
        newStock: newStock.toFixed(3),
        unitCost: item.costPrice,
        referenceId: sale.code,
        reason: `Venda no PDV ${sale.code} (${session.name})`
      })
    }

    return {
      message: `Venda ${sale.code} finalizada com sucesso!`,
      sale
    }
  })

  return result
})
