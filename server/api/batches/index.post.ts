import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { productBatches, products, stockMovements } from '../../database/schema'

const createBatchSchema = z.object({
  productId: z.number().int().positive('Produto é obrigatório'),
  batchNumber: z.string().min(1, 'Número do lote é obrigatório'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  costPrice: z.coerce.number().min(0).default(0),
  manufacturingDate: z.string().optional().nullable(),
  expirationDate: z.string().min(1, 'Data de validade é obrigatória'),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = createBatchSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const result = await db.transaction(async (tx) => {
    const product = await tx.query.products.findFirst({
      where: eq(products.id, data.productId)
    })

    if (!product) {
      throw createError({ statusCode: 404, message: 'Produto não encontrado' })
    }

    const currentStock = Number(product.currentStock)
    const newStock = currentStock + data.quantity

    // 1. Criar Lote
    const [batch] = await tx
      .insert(productBatches)
      .values({
        productId: product.id,
        batchNumber: data.batchNumber.trim(),
        initialQuantity: data.quantity.toFixed(3),
        currentQuantity: data.quantity.toFixed(3),
        costPrice: data.costPrice ? data.costPrice.toFixed(2) : product.costPrice,
        manufacturingDate: data.manufacturingDate || null,
        expirationDate: data.expirationDate,
        active: data.active
      })
      .returning()

    // 2. Atualizar estoque do produto
    await tx
      .update(products)
      .set({
        currentStock: newStock.toFixed(3),
        updatedAt: new Date().toISOString()
      })
      .where(eq(products.id, product.id))

    // 3. Registrar movimentação de estoque com vínculo ao lote
    await tx.insert(stockMovements).values({
      productId: product.id,
      batchId: batch.id,
      userId: session.id,
      type: 'ENTRY',
      quantity: data.quantity.toFixed(3),
      previousStock: currentStock.toFixed(3),
      newStock: newStock.toFixed(3),
      unitCost: data.costPrice ? data.costPrice.toFixed(2) : product.costPrice,
      referenceId: `LOTE-${batch.batchNumber}`,
      reason: `Entrada via cadastro de lote ${batch.batchNumber} (Validade: ${data.expirationDate})`
    })

    return {
      message: `Lote "${batch.batchNumber}" cadastrado com sucesso!`,
      batch
    }
  })

  return result
})
