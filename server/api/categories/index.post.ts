import { z } from 'zod'
import { eq, ilike } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { categories } from '../../database/schema'

const createCategorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres'),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = createCategorySchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // Verificar se categoria com o mesmo nome já existe
  const existing = await db.query.categories.findFirst({
    where: ilike(categories.name, data.name.trim())
  })

  if (existing) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Categoria já cadastrada',
      data: { errors: { name: ['Já existe uma categoria cadastrada com este nome.'] } }
    })
  }

  const [created] = await db.insert(categories).values({
    name: data.name.trim(),
    description: data.description?.trim() || null,
    active: data.active
  }).returning()

  return {
    message: 'Categoria cadastrada com sucesso',
    category: created
  }
})
