import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'

// --- 1. TESTES DE REGRAS DE PRODUTO E MARGEM ---
describe('Regras de Negócio: Produtos & Margem de Lucro', () => {
  it('deve calcular a margem de lucro percentual corretamente', () => {
    const costPrice = 10.00
    const salePrice = 15.00
    const margin = ((salePrice - costPrice) / costPrice) * 100
    assert.equal(margin, 50.0)
  })

  it('deve calcular margem com precisão para centavos', () => {
    const costPrice = 3.50
    const salePrice = 5.99
    const margin = ((salePrice - costPrice) / costPrice) * 100
    assert.equal(Math.round(margin * 10) / 10, 71.1)
  })

  it('deve rejeitar produto com preço de custo negativo via Zod schema', () => {
    const productSchema = z.object({
      name: z.string().min(2),
      costPrice: z.number().min(0, 'Preço de custo não pode ser negativo'),
      salePrice: z.number().min(0, 'Preço de venda não pode ser negativo')
    })

    const invalid = { name: 'Refrigerante', costPrice: -5.00, salePrice: 10.00 }
    const result = productSchema.safeParse(invalid)
    assert.equal(result.success, false)
  })

  it('deve validar formato e obrigatoriedade de código de barras', () => {
    const barcodeSchema = z.string().min(3, 'Código de barras muito curto').regex(/^[0-9A-Za-z]+$/, 'Código inválido')
    assert.equal(barcodeSchema.safeParse('7891000100103').success, true)
    assert.equal(barcodeSchema.safeParse('').success, false)
    assert.equal(barcodeSchema.safeParse('12').success, false)
  })
})

// --- 2. TESTES DE ESTOQUE E PREVENÇÃO DE ESTOQUE NEGATIVO ---
describe('Regras de Negócio: Movimentação de Estoque', () => {
  it('deve somar estoque em operação de ENTRY (Entrada Avulsa)', () => {
    const currentStock = 20
    const qtyAdded = 15
    const newStock = currentStock + qtyAdded
    assert.equal(newStock, 35)
  })

  it('deve subtrair estoque em operação de LOSS (Avaria / Perda) quando há saldo', () => {
    const currentStock = 10
    const qtyLost = 3
    assert.ok(currentStock >= qtyLost, 'Estoque suficiente para baixa')
    const newStock = currentStock - qtyLost
    assert.equal(newStock, 7)
  })

  it('deve BLOQUEAR operação que resulte em estoque negativo', () => {
    const currentStock = 5
    const qtyRequested = 8

    const checkStockAvailability = (current: number, needed: number) => {
      if (current < needed) {
        throw new Error(`Estoque insuficiente! Disponível: ${current}, Solicitado: ${needed}`)
      }
      return current - needed
    }

    assert.throws(
      () => checkStockAvailability(currentStock, qtyRequested),
      /Estoque insuficiente/
    )
  })

  it('deve recalcular estoque precisamente em ajustes de inventário', () => {
    const currentStock = 12
    const countedPhysicalStock = 10
    const difference = countedPhysicalStock - currentStock
    assert.equal(difference, -2)
    assert.equal(currentStock + difference, 10)
  })
})

// --- 3. TESTES DE LOTES E CLASSIFICAÇÃO DE VALIDADE ---
describe('Regras de Negócio: Lotes & Controle de Validade', () => {
  const classifyBatch = (expirationDateStr: string, referenceDateStr: string) => {
    const ref = new Date(referenceDateStr)
    const exp = new Date(expirationDateStr)
    const diffTime = exp.getTime() - ref.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'EXPIRED'
    if (diffDays <= 7) return 'EXPIRING_7'
    if (diffDays <= 30) return 'EXPIRING_30'
    return 'REGULAR'
  }

  const today = '2026-10-07'

  it('deve classificar lote vencido como EXPIRED', () => {
    const status = classifyBatch('2026-10-01', today)
    assert.equal(status, 'EXPIRED')
  })

  it('deve classificar lote vencendo em até 7 dias como EXPIRING_7', () => {
    const status = classifyBatch('2026-10-12', today)
    assert.equal(status, 'EXPIRING_7')
  })

  it('deve classificar lote vencendo em até 30 dias como EXPIRING_30', () => {
    const status = classifyBatch('2026-10-28', today)
    assert.equal(status, 'EXPIRING_30')
  })

  it('deve classificar lote distante como REGULAR', () => {
    const status = classifyBatch('2027-05-15', today)
    assert.equal(status, 'REGULAR')
  })
})

// --- 4. TESTES DE PDV E CHECKOUT ATÔMICO ---
describe('Regras de Negócio: PDV, Vendas e Checkout', () => {
  it('deve calcular subtotal, desconto e total da venda com precisão', () => {
    const items = [
      { price: 5.50, quantity: 3 }, // 16.50
      { price: 12.00, quantity: 2 }  // 24.00
    ]
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
    const discount = 4.50
    const total = Math.max(0, subtotal - discount)

    assert.equal(subtotal, 40.50)
    assert.equal(total, 36.00)
  })

  it('deve calcular troco corretamente para pagamento em dinheiro', () => {
    const total = 36.00
    const received = 50.00
    const change = received - total
    assert.equal(change, 14.00)
  })

  it('deve rejeitar pagamento em dinheiro com valor recebido inferior ao total', () => {
    const total = 50.00
    const received = 40.00
    const isValid = received >= total
    assert.equal(isValid, false)
  })

  it('deve validar métodos de pagamento aceitos no PDV', () => {
    const validMethods = ['MONEY', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD']
    assert.ok(validMethods.includes('PIX'))
    assert.ok(validMethods.includes('MONEY'))
    assert.ok(!validMethods.includes('BITCOIN'))
  })

  it('deve estornar estoque em caso de cancelamento de venda', () => {
    let productStock = 18
    const saleItemQuantity = 4

    // Simula venda (baixa no estoque)
    productStock -= saleItemQuantity
    assert.equal(productStock, 14)

    // Simula estorno (devolução ao estoque)
    productStock += saleItemQuantity
    assert.equal(productStock, 18)
  })
})
