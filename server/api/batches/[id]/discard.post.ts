import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../../utils/auth'
import { useDb } from '../../../utils/db'
import { productBatches, products, stockMovements } from '../../../database/schema'

const discardSchema = z.object({
  reason: z.string().min(3, 'O motivo do descarte é obrigatório (mínimo 3 caracteres)')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const body = await readBody(event)
  const validation = discardSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { reason } = validation.data
  const db = await useDb()

  const result = await db.transaction(async (tx) => {
    // 1. Buscar lote
    const batch = await tx.query.productBatches.findFirst({
      where: eq(productBatches.id, id),
      with: { product: true }
    })

    if (!batch) {
      throw createError({ statusCode: 404, message: 'Lote não encontrado' })
    }

    const batchQty = Number(batch.currentQuantity)
    if (batchQty <= 0) {
      throw createError({
        statusCode: 400,
        message: 'Este lote já possui saldo zerado e não requer descarte.'
      })
    }

    const product = batch.product
    const currentProductStock = Number(product.currentStock)
    const newProductStock = Math.max(0, currentProductStock - batchQty)

    // 2. Zerar lote e marcar como inativo
    await tx
      .update(productBatches)
      .set({
        currentQuantity: '0.000',
        active: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(productBatches.id, batch.id))

    // 3. Atualizar estoque do produto
    await tx
      .update(products)
      .set({
        currentStock: newProductStock.toFixed(3),
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, product.id))

    // 4. Registrar movimentação de perda (LOSS)
    await tx.insert(stockMovements).values({
      productId: product.id,
      batchId: batch.id,
      userId: session.id,
      type: 'LOSS',
      quantity: (-batchQty).toFixed(3),
      previousStock: currentProductStock.toFixed(3),
      newStock: newProductStock.toFixed(3),
      unitCost: batch.costPrice,
      referenceId: `DESCARTE-LOTE-${batch.batchNumber}`,
      reason: `Descarte de lote ${batch.batchNumber} (Validade: ${batch.expirationDate}). Motivo: ${reason}`
    })

    return {
      message: `Lote "${batch.batchNumber}" descartado com sucesso. ${batchQty} unidade(s) baixada(s) do estoque.`,
      discardedQuantity: batchQty
    }
  })

  return result
})
