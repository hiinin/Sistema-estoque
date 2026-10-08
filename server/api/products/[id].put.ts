import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, suppliers } from '../../database/schema'

const updateProductSchema = z.object({
  sku: z.string().min(2, 'SKU é obrigatório (mínimo 2 caracteres)'),
  barcode: z.string().min(3, 'Código de barras é obrigatório (mínimo 3 caracteres)'),
  name: z.string().min(2, 'Nome do produto é obrigatório'),
  description: z.string().optional().nullable(),
  categoryId: z.number().int().positive(),
  supplierId: z.number().int().positive().optional().nullable(),
  costPrice: z.coerce.number().min(0, 'Preço de custo não pode ser negativo'),
  salePrice: z.coerce.number().min(0, 'Preço de venda não pode ser negativo'),
  minimumStock: z.coerce.number().min(0, 'Estoque mínimo não pode ser negativo').default(0),
  maximumStock: z.coerce.number().min(0, 'Estoque máximo não pode ser negativo').default(0),
  unit: z.string().min(1).default('UN'),
  active: z.boolean()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const body = await readBody(event)
  const validation = updateProductSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const existing = await db.query.products.findFirst({
    where: eq(products.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Produto não encontrado' })
  }

  // 1. Validar duplicidade de código de barras em outro produto
  const duplicateBarcode = await db.query.products.findFirst({
    where: and(
      eq(products.barcode, data.barcode.trim()),
      ne(products.id, id)
    )
  })
  if (duplicateBarcode) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Código de barras em uso',
      data: { errors: { barcode: [`O código de barras "${data.barcode}" já pertence a "${duplicateBarcode.name}".`] } }
    })
  }

  // 2. Validar duplicidade de SKU em outro produto
  const duplicateSku = await db.query.products.findFirst({
    where: and(
      eq(products.sku, data.sku.trim()),
      ne(products.id, id)
    )
  })
  if (duplicateSku) {
    throw createError({
      statusCode: 422,
      statusMessage: 'SKU em uso',
      data: { errors: { sku: [`O SKU "${data.sku}" já pertence a "${duplicateSku.name}".`] } }
    })
  }

  // 3. Validar categoria
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

  // 4. Validar fornecedor
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

  const [updated] = await db
    .update(products)
    .set({
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categoryId: data.categoryId,
      supplierId: data.supplierId || null,
      costPrice: data.costPrice.toFixed(2),
      salePrice: data.salePrice.toFixed(2),
      minimumStock: data.minimumStock.toFixed(3),
      maximumStock: data.maximumStock.toFixed(3),
      unit: data.unit.trim().toUpperCase(),
      active: data.active,
      updatedAt: new Date().toISOString()
    })
    .where(eq(products.id, id))
    .returning()

  return {
    message: 'Produto atualizado com sucesso',
    product: updated
  }
})
