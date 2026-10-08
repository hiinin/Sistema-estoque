import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, suppliers, stockMovements } from '../../database/schema'

const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU é obrigatório (mínimo 2 caracteres)'),
  barcode: z.string().min(3, 'Código de barras é obrigatório (mínimo 3 caracteres)'),
  name: z.string().min(2, 'Nome do produto é obrigatório'),
  description: z.string().optional().nullable(),
  categoryId: z.number({ required_error: 'Selecione uma categoria' }).int().positive(),
  supplierId: z.number().int().positive().optional().nullable(),
  costPrice: z.coerce.number().min(0, 'Preço de custo não pode ser negativo'),
  salePrice: z.coerce.number().min(0, 'Preço de venda não pode ser negativo'),
  initialStock: z.coerce.number().min(0, 'Estoque inicial não pode ser negativo').default(0),
  minimumStock: z.coerce.number().min(0, 'Estoque mínimo não pode ser negativo').default(0),
  maximumStock: z.coerce.number().min(0, 'Estoque máximo não pode ser negativo').default(0),
  unit: z.string().min(1).default('UN'),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = createProductSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // 1. Validar unicidade de código de barras
  const existingBarcode = await db.query.products.findFirst({
    where: eq(products.barcode, data.barcode.trim())
  })
  if (existingBarcode) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Código de barras já cadastrado',
      data: { errors: { barcode: [`O código de barras "${data.barcode}" já pertence ao produto "${existingBarcode.name}".`] } }
    })
  }

  // 2. Validar unicidade de SKU
  const existingSku = await db.query.products.findFirst({
    where: eq(products.sku, data.sku.trim())
  })
  if (existingSku) {
    throw createError({
      statusCode: 422,
      statusMessage: 'SKU já cadastrado',
      data: { errors: { sku: [`O SKU "${data.sku}" já está em uso pelo produto "${existingSku.name}".`] } }
    })
  }

  // 3. Validar existência da categoria
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, data.categoryId)
  })
  if (!category) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Categoria inválida',
      data: { errors: { categoryId: ['A categoria selecionada não existe.'] } }
    })
  }

  // 4. Validar existência do fornecedor se fornecido
  if (data.supplierId) {
    const supplier = await db.query.suppliers.findFirst({
      where: eq(suppliers.id, data.supplierId)
    })
    if (!supplier) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Fornecedor inválido',
        data: { errors: { supplierId: ['O fornecedor selecionado não existe.'] } }
      })
    }
  }

  // 5. Inserir produto
  const [created] = await db.insert(products).values({
    sku: data.sku.trim().toUpperCase(),
    barcode: data.barcode.trim(),
    name: data.name.trim(),
    description: data.description?.trim() || null,
    categoryId: data.categoryId,
    supplierId: data.supplierId || null,
    costPrice: data.costPrice.toFixed(2),
    salePrice: data.salePrice.toFixed(2),
    currentStock: data.initialStock.toFixed(3),
    minimumStock: data.minimumStock.toFixed(3),
    maximumStock: data.maximumStock.toFixed(3),
    unit: data.unit.trim().toUpperCase(),
    active: data.active
  }).returning()

  // 6. Se foi informado estoque inicial > 0, registrar movimentação de auditoria
  if (data.initialStock > 0) {
    await db.insert(stockMovements).values({
      productId: created.id,
      userId: session.id,
      type: 'ENTRY',
      quantity: data.initialStock.toFixed(3),
      previousStock: '0.000',
      newStock: data.initialStock.toFixed(3),
      unitCost: data.costPrice.toFixed(2),
      referenceId: 'CADASTRO-INICIAL',
      reason: 'Estoque inicial registrado no cadastro do produto'
    })
  }

  return {
    message: 'Produto cadastrado com sucesso',
    product: created
  }
})
