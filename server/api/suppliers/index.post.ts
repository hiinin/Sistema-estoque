import { z } from 'zod'
import { eq, ilike } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { suppliers } from '../../database/schema'

const createSupplierSchema = z.object({
  name: z.string().min(2, 'A razão social / nome deve ter pelo menos 2 caracteres'),
  cnpj: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  active: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const body = await readBody(event)
  const validation = createSupplierSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Dados inválidos',
      data: { errors: validation.error.flatten().fieldErrors }
    })
  }

  const data = validation.data
  const db = await useDb()

  // Se CNPJ foi fornecido, verificar duplicidade
  if (data.cnpj && data.cnpj.trim()) {
    const existing = await db.query.suppliers.findFirst({
      where: eq(suppliers.cnpj, data.cnpj.trim())
    })
    if (existing) {
      throw createError({
        statusCode: 422,
        statusMessage: 'CNPJ já cadastrado',
        data: { errors: { cnpj: ['Este CNPJ já está cadastrado para outro fornecedor.'] } }
      })
    }
  }

  const [created] = await db.insert(suppliers).values({
    name: data.name.trim(),
    cnpj: data.cnpj?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    active: data.active
  }).returning()

  return {
    message: 'Fornecedor cadastrado com sucesso',
    supplier: created
  }
})
