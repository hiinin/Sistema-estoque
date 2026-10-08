import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, stockMovements, productBatches } from '../../database/schema'

const adjustmentSchema = z.object({
  productId: z.number().int().positive('Produto obrigatório'),
  batchId: z.number().int().positive().optional().nullable(),
  type: z.enum(['ENTRY', 'LOSS', 'ADJUSTMENT', 'RETURN'], {
    message: 'Tipo de movimentação inválido'
  }),
  // Para ADJUSTMENT pode ser o novo estoque total absoluto, ou para ENTRY/LOSS a quantidade movimentada
  mode: z.enum(['DELTA', 'SET_TOTAL']).default('DELTA'),
  quantity: z.coerce.number(),
  reason: z.string().min(3, 'O motivo/justificativa é obrigatório (mínimo 3 caracteres)')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = adjustmentSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // Executar dentro de transação para garantir integridade atômica
  const result = await db.transaction(async (tx) => {
    // 1. Buscar o produto com lock/leitura
    const product = await tx.query.products.findFirst({
      where: eq(products.id, data.productId)
    })

    if (!product) {
      throw createError({ statusCode: 404, message: 'Produto não encontrado' })
    }

    const currentStock = Number(product.currentStock)
    let deltaQty = 0
    let newStock = 0

    if (data.mode === 'SET_TOTAL') {
      if (data.quantity < 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Estoque negativo não permitido',
          message: 'O novo saldo de estoque não pode ser negativo.'
        })
      }
      newStock = data.quantity
      deltaQty = newStock - currentStock
    } else {
      // Modo DELTA: quantidade a somar ou subtrair
      if (data.quantity <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Quantidade inválida',
          message: 'A quantidade informada deve ser maior que zero.'
        })
      }

      if (data.type === 'LOSS') {
        deltaQty = -data.quantity
      } else if (data.type === 'ENTRY' || data.type === 'RETURN') {
        deltaQty = data.quantity
      } else {
        // ADJUSTMENT delta
        deltaQty = data.quantity
      }

      newStock = currentStock + deltaQty
    }

    // 2. REGRA CRÍTICA: NÃO PERMITIR ESTOQUE NEGATIVO
    if (newStock < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Estoque insuficiente',
        message: `Não foi possível registrar a saída. O produto "${product.name}" possui apenas ${currentStock} unidade(s) disponível(is). Solicitado: ${Math.abs(deltaQty)}.`
      })
    }

    // 3. Atualizar estoque do produto
    await tx
      .update(products)
      .set({
        currentStock: newStock.toFixed(3),
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, product.id))

    // 4. Se houver lote associado, atualizar o lote também
    if (data.batchId) {
      const batch = await tx.query.productBatches.findFirst({
        where: eq(productBatches.id, data.batchId)
      })
      if (batch) {
        const batchCurrent = Number(batch.currentQuantity)
        const batchNew = batchCurrent + deltaQty
        if (batchNew < 0) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Lote insuficiente',
            message: `O lote "${batch.batchNumber}" possui apenas ${batchCurrent} disponível. Tentativa de baixa de ${Math.abs(deltaQty)}.`
          })
        }
        await tx
          .update(productBatches)
          .set({
            currentQuantity: batchNew.toFixed(3),
            updatedAt: new Date().toISOString()
          })
          .where(eq(productBatches.id, batch.id))
      }
    }

    // 5. REGRA CRÍTICA: Gravar movimentação de auditoria
    const [movement] = await tx
      .insert(stockMovements)
      .values({
        productId: product.id,
        batchId: data.batchId || null,
        userId: session.id,
        type: data.type,
        quantity: deltaQty.toFixed(3),
        previousStock: currentStock.toFixed(3),
        newStock: newStock.toFixed(3),
        unitCost: product.costPrice,
        referenceId: data.type === 'ADJUSTMENT' ? 'AJUSTE-INVENTARIO' : data.type === 'LOSS' ? 'PERDA-AVARIA' : 'ENTRADA-AVULSA',
        reason: data.reason.trim()
      })
      .returning()

    return {
      message: 'Movimentação de estoque realizada com sucesso.',
      newStock,
      movement
    }
  })

  return result
})
