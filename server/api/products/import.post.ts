import { z } from 'zod'
import { eq, or } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, categories, stockMovements } from '../../database/schema'

const importRowSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  barcode: z.string().min(3, 'Código de barras inválido'),
  sku: z.string().min(2, 'SKU inválido'),
  categoryName: z.string().optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().min(0).default(0),
  minimumStock: z.coerce.number().min(0).default(5),
  unit: z.string().default('UN')
})

const importBatchSchema = z.object({
  items: z.array(importRowSchema).min(1, 'A planilha precisa ter pelo menos um item válido')
})

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = importBatchSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const { items } = validation.data
  const db = await useDb()

  let insertedCount = 0
  let updatedCount = 0
  const skippedErrors: Array<{ barcode: string; name: string; error: string }> = []

  // Cache de categorias para evitar queries repetitivas
  const existingCategories = await db.query.categories.findMany()
  const categoryMap = new Map<string, number>()
  for (const c of existingCategories) {
    categoryMap.set(c.name.trim().toLowerCase(), c.id)
  }

  // Se houver uma categoria padrão, busca ou usa a primeira
  let defaultCategoryId = existingCategories[0]?.id

  for (const item of items) {
    try {
      // 1. Resolver categoria
      let catId = defaultCategoryId
      if (item.categoryName) {
        const cleanCat = item.categoryName.trim().toLowerCase()
        if (categoryMap.has(cleanCat)) {
          catId = categoryMap.get(cleanCat)!
        } else {
          // Cria nova categoria automaticamente
          const [newCat] = await db
            .insert(categories)
            .values({
              name: item.categoryName.trim(),
              description: 'Criada via importação de planilha'
            })
            .returning()
          categoryMap.set(cleanCat, newCat.id)
          catId = newCat.id
        }
      }

      // 2. Verificar se produto já existe por barcode ou SKU
      const existingProduct = await db.query.products.findFirst({
        where: or(
          eq(products.barcode, item.barcode.trim()),
          eq(products.sku, item.sku.trim())
        )
      })

      if (existingProduct) {
        // Atualiza preço e estoques
        const previousStock = Number(existingProduct.currentStock)
        const newStock = item.currentStock

        await db
          .update(products)
          .set({
            name: item.name.trim(),
            costPrice: item.costPrice.toFixed(2),
            salePrice: item.salePrice.toFixed(2),
            currentStock: newStock.toFixed(3),
            minimumStock: item.minimumStock.toFixed(3),
            unit: item.unit.toUpperCase(),
            categoryId: catId,
            updatedAt: new Date().toISOString()
          })
          .where(eq(products.id, existingProduct.id))

        if (newStock !== previousStock) {
          const diff = newStock - previousStock
          await db.insert(stockMovements).values({
            productId: existingProduct.id,
            userId: session.id,
            type: 'ADJUSTMENT',
            quantity: diff.toFixed(3),
            previousStock: previousStock.toFixed(3),
            newStock: newStock.toFixed(3),
            unitCost: item.costPrice.toFixed(2),
            referenceId: 'IMPORT-CSV',
            reason: `Ajuste via importação de planilha CSV (${session.name})`
          })
        }

        updatedCount++
      } else {
        // Insere novo produto
        const [inserted] = await db
          .insert(products)
          .values({
            name: item.name.trim(),
            barcode: item.barcode.trim(),
            sku: item.sku.trim(),
            costPrice: item.costPrice.toFixed(2),
            salePrice: item.salePrice.toFixed(2),
            currentStock: item.currentStock.toFixed(3),
            minimumStock: item.minimumStock.toFixed(3),
            unit: item.unit.toUpperCase(),
            categoryId: catId,
            active: true
          })
          .returning()

        if (item.currentStock > 0) {
          await db.insert(stockMovements).values({
            productId: inserted.id,
            userId: session.id,
            type: 'ENTRY',
            quantity: item.currentStock.toFixed(3),
            previousStock: '0.000',
            newStock: item.currentStock.toFixed(3),
            unitCost: item.costPrice.toFixed(2),
            referenceId: 'IMPORT-CSV',
            reason: `Estoque inicial cadastrado via importação CSV (${session.name})`
          })
        }

        insertedCount++
      }
    } catch (err: any) {
      skippedErrors.push({
        barcode: item.barcode,
        name: item.name,
        error: err.message || 'Erro ao processar item'
      })
    }
  }

  return {
    message: `Importação concluída: ${insertedCount} criados, ${updatedCount} atualizados.`,
    insertedCount,
    updatedCount,
    skippedErrors
  }
})
