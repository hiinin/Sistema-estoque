import { eq, sql } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { suppliers, products, purchases } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  const supplier = await db.query.suppliers.findFirst({
    where: eq(suppliers.id, id)
  })

  if (!supplier) {
    throw createError({ statusCode: 404, message: 'Fornecedor não encontrado' })
  }

  // Verificar se há produtos vinculados
  const [productCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.supplierId, id))

  const productCount = productCountResult?.count || 0

  // Verificar se há compras vinculadas
  const [purchaseCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchases)
    .where(eq(purchases.supplierId, id))

  const purchaseCount = purchaseCountResult?.count || 0

  if (productCount > 0 || purchaseCount > 0) {
    // Se possui vínculos históricos, desativa o fornecedor em vez de corromper dados
    await db.update(suppliers).set({ active: false }).where(eq(suppliers.id, id))
    return {
      message: `Fornecedor "${supplier.name}" possui vínculos no sistema (${productCount} produto(s), ${purchaseCount} compra(s)) e foi marcado como inativo para preservar o histórico.`
    }
  }

  // Sem vínculos, exclusão física segura
  await db.delete(suppliers).where(eq(suppliers.id, id))

  return {
    message: `Fornecedor "${supplier.name}" excluído com sucesso.`
  }
})
