import { z } from 'zod'
import { eq, and, ne, ilike } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { categories } from '../../database/schema'

const updateCategorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria deve ter pelo menos 2 caracteres'),
  description: z.string().optional().nullable(),
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
  const validation = updateCategorySchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const existing = await db.query.categories.findFirst({
    where: eq(categories.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Categoria não encontrada' })
  }

  // Verificar se o novo nome já pertence a outra categoria
  const duplicate = await db.query.categories.findFirst({
    where: and(
      ilike(categories.name, data.name.trim()),
      ne(categories.id, id)
    )
  })

  if (duplicate) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Nome indisponível',
      data: { errors: { name: ['Já existe outra categoria com este nome.'] } }
    })
  }

  const [updated] = await db
    .update(categories)
    .set({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      active: data.active,
      updatedAt: new Date().toISOString()
    })
    .where(eq(categories.id, id))
    .returning()

  return {
    message: 'Categoria atualizada com sucesso',
    category: updated
  }
})
