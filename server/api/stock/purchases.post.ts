import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import {
  purchases,
  purchaseItems,
  products,
  productBatches,
  stockMovements,
  suppliers
} from '../../database/schema'

const purchaseItemSchema = z.object({
  productId: z.number().int().positive('Produto inválido'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  costPrice: z.coerce.number().min(0, 'Custo unitário inválido'),
  batchNumber: z.string().optional().nullable(),
  manufacturingDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable()
})

const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, 'Adicione pelo menos um item à entrada')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = createPurchaseSchema.safeParse(body)

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
    // 1. Validar fornecedor se informado
    if (data.supplierId) {
      const supplier = await tx.query.suppliers.findFirst({
        where: eq(suppliers.id, data.supplierId)
      })
      if (!supplier) {
        throw createError({ statusCode: 400, message: 'Fornecedor não encontrado' })
      }
    }

    // 2. Gerar código único para a compra/entrada
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const code = `ENT-${todayStr}-${randomSuffix}`

    // 3. Calcular total
    const total = data.items.reduce(
      (acc, item) => acc + item.quantity * item.costPrice,
      0
    )

    // 4. Criar registro de compra
    const [purchase] = await tx
      .insert(purchases)
      .values({
        code,
        supplierId: data.supplierId || null,
        userId: session.id,
        total: total.toFixed(2),
        invoiceNumber: data.invoiceNumber?.trim() || null,
        notes: data.notes?.trim() || null
      })
      .returning()

    // 5. Processar itens da compra
    for (const item of data.items) {
      const product = await tx.query.products.findFirst({
        where: eq(products.id, item.productId)
      })

      if (!product) {
        throw createError({
          statusCode: 400,
          message: `Produto com ID ${item.productId} não encontrado.`
        })
      }

      const currentStock = Number(product.currentStock)
      const newStock = currentStock + item.quantity
      const subtotal = item.quantity * item.costPrice

      // Inserir item da compra
      await tx.insert(purchaseItems).values({
        purchaseId: purchase.id,
        productId: product.id,
        quantity: item.quantity.toFixed(3),
        costPrice: item.costPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
        batchNumber: item.batchNumber?.trim() || null,
        manufacturingDate: item.manufacturingDate || null,
        expirationDate: item.expirationDate || null
      })

      // Criar lote se lote e validade foram informados
      let createdBatchId: number | null = null
      if (item.batchNumber && item.expirationDate) {
        const [batch] = await tx
          .insert(productBatches)
          .values({
            productId: product.id,
            batchNumber: item.batchNumber.trim(),
            initialQuantity: item.quantity.toFixed(3),
            currentQuantity: item.quantity.toFixed(3),
            costPrice: item.costPrice.toFixed(2),
            manufacturingDate: item.manufacturingDate || null,
            expirationDate: item.expirationDate,
            active: true
          })
          .returning()
        createdBatchId = batch.id
      }

      // Atualizar estoque e atualizar custo do produto
      await tx
        .update(products)
        .set({
          currentStock: newStock.toFixed(3),
          costPrice: item.costPrice.toFixed(2),
          updatedAt: new Date().toISOString()
        })
        .where(eq(products.id, product.id))

      // Gravar movimentação de auditoria
      await tx.insert(stockMovements).values({
        productId: product.id,
        batchId: createdBatchId,
        userId: session.id,
        type: 'PURCHASE',
        quantity: item.quantity.toFixed(3),
        previousStock: currentStock.toFixed(3),
        newStock: newStock.toFixed(3),
        unitCost: item.costPrice.toFixed(2),
        referenceId: purchase.code,
        reason: `Entrada/Compra ${purchase.code}${data.invoiceNumber ? ` (NF: ${data.invoiceNumber})` : ''}`
      })
    }

    return {
      message: `Entrada de estoque ${purchase.code} registrada com sucesso!`,
      purchase
    }
  })

  return result
})
