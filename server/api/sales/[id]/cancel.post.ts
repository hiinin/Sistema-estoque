import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../../utils/auth'
import { useDb } from '../../../utils/db'
import { sales, saleItems, products, stockMovements } from '../../../database/schema'

const cancelSchema = z.object({
  reason: z.string().min(3, 'O motivo do cancelamento é obrigatório')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const body = await readBody(event)
  const validation = cancelSchema.safeParse(body)

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
    // 1. Buscar venda com itens
    const sale = await tx.query.sales.findFirst({
      where: eq(sales.id, id),
      with: {
        items: {
          with: { product: true }
        }
      }
    })

    if (!sale) {
      throw createError({ statusCode: 404, message: 'Venda não encontrada' })
    }

    if (sale.status === 'CANCELLED') {
      throw createError({
        statusCode: 400,
        message: 'Esta venda já se encontra cancelada.'
      })
    }

    // 2. Marcar venda como CANCELLED
    await tx
      .update(sales)
      .set({
        status: 'CANCELLED',
        notes: sale.notes ? `${sale.notes} | Cancelada: ${reason}` : `Cancelada: ${reason}`,
        updatedAt: new Date().toISOString()
      })
      .where(eq(sales.id, sale.id))

    // 3. Devolver produtos ao estoque e gravar movimentação de estorno (RETURN)
    for (const item of sale.items) {
      const product = item.product
      const currentStock = Number(product.currentStock)
      const qtyReturned = Number(item.quantity)
      const newStock = currentStock + qtyReturned

      await tx
        .update(products)
        .set({
          currentStock: newStock.toFixed(3),
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.id, product.id))

      await tx.insert(stockMovements).values({
        productId: product.id,
        batchId: item.batchId,
        userId: session.id,
        type: 'RETURN',
        quantity: qtyReturned.toFixed(3),
        previousStock: currentStock.toFixed(3),
        newStock: newStock.toFixed(3),
        unitCost: item.costPrice,
        referenceId: `ESTORNO-${sale.code}`,
        reason: `Estorno de venda cancelada ${sale.code}. Motivo: ${reason}`
      })
    }

    return {
      message: `Venda ${sale.code} cancelada com sucesso. Itens estornados ao estoque.`
    }
  })

  return result
})
