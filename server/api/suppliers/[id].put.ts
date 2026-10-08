import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { suppliers } from '../../database/schema'

const updateSupplierSchema = z.object({
  name: z.string().min(2, 'A razão social / nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
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
  const validation = updateSupplierSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  const existing = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Fornecedor não encontrado' })
  }

  // Se CNPJ foi informado, verificar se outro fornecedor já usa
  if (data.cnpj && data.cnpj.trim()) {
    const duplicate = await db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.cnpj, data.cnpj.trim()),
        ne(suppliers.id, id)
      )
    })
    if (duplicate) {
      throw createError({
        statusCode: 422,
        statusMessage: 'CNPJ já cadastrado',
        data: { errors: { cnpj: ['Este CNPJ já pertence a outro fornecedor.'] } }
      })
    }
  }

  const [updated] = await db
    .update(suppliers)
    .set({
      name: data.name.trim(),
      cnpj: data.cnpj?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      active: data.active,
      updatedAt: new Date().toISOString()
    })
    .where(eq(suppliers.id, id))
    .returning()

  return {
    message: 'Fornecedor atualizado com sucesso',
    supplier: updated
  }
})
