import { eq, sql } from 'drizzle-orm'
import { requireRole } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { products, saleItems, purchaseItems, stockMovements } from '../../database/schema'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'MANAGER'])
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const db = await useDb()

  const product = await db.query.products.findFirst({
    where: eq(products.id, id)
  })

  if (!product) {
    throw createError({ statusCode: 404, message: 'Produto não encontrado' })
  }

  // 1. Verificar se há vendas vinculadas
  const [salesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(saleItems)
    .where(eq(saleItems.productId, id))
  const salesCount = salesResult?.count || 0

  // 2. Verificar se há compras vinculadas
  const [purchasesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseItems)
    .where(eq(purchaseItems.productId, id))
  const purchasesCount = purchasesResult?.count || 0

  // 3. Se possui transações históricas, desativa para manter integridade
  if (salesCount > 0 || purchasesCount > 0) {
    await db.update(products).set({ active: false }).where(eq(products.id, id))
    return {
      message: `O produto "${product.name}" possui histórico no sistema (${salesCount} venda(s), ${purchasesCount} compra(s)) e foi marcado como inativo para preservar o estoque e relatórios.`
    }
  }

  // 4. Remover movimentações sem vendas e excluir produto
  await db.delete(stockMovements).where(eq(stockMovements.productId, id))
  await db.delete(products).where(eq(products.id, id))

  return {
    message: `Produto "${product.name}" excluído com sucesso.`
  }
})
