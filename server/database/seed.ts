import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import bcrypt from 'bcryptjs'
import * as schema from './schema'
import { sql } from 'drizzle-orm'

const url = process.env.DATABASE_URL || 'postgresql://postgres:8uZNPz2jBdUOYkixS93sbe5l@db.jasxeuyqlfuwgajbsnyh.supabase.co:5432/postgres'

async function seed() {
  console.log('Iniciando seed do banco de dados...')
  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })

  try {
    // 1. Limpar dados existentes (em ordem para respeitar FKs)
    console.log('Limpando tabelas anteriores...')
    await db.delete(schema.stockMovements)
    await db.delete(schema.saleItems)
    await db.delete(schema.sales)
    await db.delete(schema.purchaseItems)
    await db.delete(schema.purchases)
    await db.delete(schema.productBatches)
    await db.delete(schema.products)
    await db.delete(schema.customers)
    await db.delete(schema.suppliers)
    await db.delete(schema.categories)
    await db.delete(schema.users)

    // 2. Criar Usuários
    console.log('Criando usuários...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const [admin, manager, operator] = await db.insert(schema.users).values([
      {
        name: 'Administrador do Sistema',
        email: 'admin@estoque.com',
        password: hashedPassword,
        role: 'ADMIN',
        active: true
      },
      {
        name: 'Carlos Gerente',
        email: 'gerente@estoque.com',
        password: hashedPassword,
        role: 'MANAGER',
        active: true
      },
      {
        name: 'Juliana Operadora de Caixa',
        email: 'operador@estoque.com',
        password: hashedPassword,
        role: 'OPERATOR',
        active: true
      }
    ]).returning()

    // 3. Criar Categorias
    console.log('Criando categorias...')
    const [catBebidas, catMercearia, catLaticinios, catLimpeza, catHigiene] = await db.insert(schema.categories).values([
      { name: 'Bebidas', description: 'Refrigerantes, sucos, águas e cervejas' },
      { name: 'Mercearia', description: 'Arroz, feijão, café, açúcar, massas e enlatados' },
      { name: 'Laticínios e Frios', description: 'Leites, queijos, iogurtes e manteigas' },
      { name: 'Limpeza', description: 'Detergentes, desinfetantes, sabão em pó' },
      { name: 'Higiene Pessoal', description: 'Sabonetes, shampoos, pastas de dente' }
    ]).returning()

    // 4. Criar Fornecedores
    console.log('Criando fornecedores...')
    const [supAmbev, supNestle, supCamil, supYpe, supUnilever] = await db.insert(schema.suppliers).values([
      {
        name: 'Ambev Brasil Distribuidora',
        cnpj: '02.286.460/0001-50',
        phone: '(11) 3741-7000',
        email: 'contato@ambev.com.br',
        address: 'Av. Brigadeiro Faria Lima, 3900 - São Paulo/SP',
        active: true
      },
      {
        name: 'Nestlé Brasil Alimentos',
        cnpj: '60.409.075/0001-52',
        phone: '(11) 5188-9000',
        email: 'atendimento@nestle.com.br',
        address: 'Av. Dr. Chucri Zaidan, 246 - São Paulo/SP',
        active: true
      },
      {
        name: 'Camil Alimentos S.A.',
        cnpj: '64.904.295/0001-03',
        phone: '(11) 2191-2000',
        email: 'vendas@camil.com.br',
        address: 'Rua Forte de Araxá, 227 - São Paulo/SP',
        active: true
      },
      {
        name: 'Química Amparo (Ypê)',
        cnpj: '43.468.647/0001-44',
        phone: '(19) 3808-8000',
        email: 'comercial@ype.ind.br',
        address: 'Av. Waldyr Beira, 1000 - Amparo/SP',
        active: true
      },
      {
        name: 'Unilever Brasil Ltda.',
        cnpj: '61.068.276/0001-04',
        phone: '(11) 3568-8000',
        email: 'corporativo@unilever.com.br',
        address: 'Av. das Nações Unidas, 14261 - São Paulo/SP',
        active: true
      }
    ]).returning()

    // 5. Criar Clientes
    console.log('Criando clientes...')
    const [cliPadrao, cliMaria, cliJoao] = await db.insert(schema.customers).values([
      { name: 'Consumidor Final', cpf: null, phone: null, email: null },
      { name: 'Maria Silva Santos', cpf: '123.456.789-00', phone: '(11) 98765-4321', email: 'maria.silva@email.com' },
      { name: 'João Carlos Pereira', cpf: '987.654.321-99', phone: '(11) 91234-5678', email: 'joao.pereira@email.com' }
    ]).returning()

    // 6. Criar Produtos com Códigos de Barra Reais
    console.log('Criando produtos...')
    const prodData = [
      {
        sku: 'BEB-COC-2000',
        barcode: '7894900011517',
        name: 'Coca-Cola Original 2L',
        description: 'Refrigerante de cola garrafa PET 2 Litros',
        categoryId: catBebidas.id,
        supplierId: supAmbev.id,
        costPrice: '7.50',
        salePrice: '11.90',
        currentStock: '60.000',
        minimumStock: '15.000',
        maximumStock: '120.000',
        unit: 'UN',
        active: true
      },
      {
        sku: 'LAT-LEI-1000',
        barcode: '7891000100103',
        name: 'Leite Integral Ninho 1L UHT',
        description: 'Leite integral longa vida Tetra Pak 1L',
        categoryId: catLaticinios.id,
        supplierId: supNestle.id,
        costPrice: '4.20',
        salePrice: '5.99',
        currentStock: '80.000',
        minimumStock: '20.000',
        maximumStock: '150.000',
        unit: 'UN',
        active: true
      },
      {
        sku: 'MER-ARR-5000',
        barcode: '7896006700018',
        name: 'Arroz Branco Tipo 1 Camil 5kg',
        description: 'Arroz branco longo fino subgrupo polido 5kg',
        categoryId: catMercearia.id,
        supplierId: supCamil.id,
        costPrice: '22.00',
        salePrice: '31.90',
        currentStock: '40.000',
        minimumStock: '10.000',
        maximumStock: '80.000',
        unit: 'PCT',
        active: true
      },
      {
        sku: 'MER-FEI-1000',
        barcode: '7896006700025',
        name: 'Feijão Carioca Camil 1kg',
        description: 'Feijão carioca tipo 1 pacote 1kg',
        categoryId: catMercearia.id,
        supplierId: supCamil.id,
        costPrice: '6.10',
        salePrice: '8.79',
        currentStock: '50.000',
        minimumStock: '15.000',
        maximumStock: '100.000',
        unit: 'PCT',
        active: true
      },
      {
        sku: 'MER-CAF-0500',
        barcode: '7891025114123',
        name: 'Café Torrado e Moído Pilão 500g',
        description: 'Café tradicional almofada 500g',
        categoryId: catMercearia.id,
        supplierId: supCamil.id,
        costPrice: '14.50',
        salePrice: '19.90',
        currentStock: '35.000',
        minimumStock: '10.000',
        maximumStock: '60.000',
        unit: 'PCT',
        active: true
      },
      {
        sku: 'LIM-DET-0500',
        barcode: '7891038001025',
        name: 'Detergente Líquido Ypê Neutro 500ml',
        description: 'Detergente lava-louças neutro biodegradável 500ml',
        categoryId: catLimpeza.id,
        supplierId: supYpe.id,
        costPrice: '1.80',
        salePrice: '2.89',
        currentStock: '90.000',
        minimumStock: '25.000',
        maximumStock: '150.000',
        unit: 'UN',
        active: true
      },
      {
        sku: 'HIG-SAB-0090',
        barcode: '7891000244104',
        name: 'Sabonete Dove Original 90g',
        description: 'Sabonete hidratante 1/4 de creme hidratante 90g',
        categoryId: catHigiene.id,
        supplierId: supUnilever.id,
        costPrice: '2.90',
        salePrice: '4.50',
        currentStock: '65.000',
        minimumStock: '20.000',
        maximumStock: '120.000',
        unit: 'UN',
        active: true
      },
      {
        sku: 'BEB-SUC-0900',
        barcode: '7898914562014',
        name: 'Suco de Laranja Integral 900ml',
        description: 'Suco de laranja natural sem adição de açúcares',
        categoryId: catBebidas.id,
        supplierId: supAmbev.id,
        costPrice: '7.00',
        salePrice: '10.50',
        currentStock: '5.000', // Alerta: estoque baixo!
        minimumStock: '12.000',
        maximumStock: '50.000',
        unit: 'GAR',
        active: true
      },
      {
        sku: 'LAT-IOG-0170',
        barcode: '7891000301012',
        name: 'Iogurte Natural Nestlé 170g',
        description: 'Iogurte desnatado sem sabor',
        categoryId: catLaticinios.id,
        supplierId: supNestle.id,
        costPrice: '2.20',
        salePrice: '3.75',
        currentStock: '25.000',
        minimumStock: '10.000',
        maximumStock: '40.000',
        unit: 'UN',
        active: true
      }
    ]

    const insertedProducts = await db.insert(schema.products).values(prodData).returning()

    // 7. Criar Lotes com diferentes status de validade
    // - Vencido
    // - Vencendo em 7 dias
    // - Vencendo em 30 dias
    // - Validade normal (longa)
    console.log('Criando lotes com controle de validade...')
    const today = new Date()
    const addDays = (d: Date, n: number) => {
      const copy = new Date(d)
      copy.setDate(copy.getDate() + n)
      return copy.toISOString().split('T')[0]
    }

    const [pCoca, pLeite, pArroz, pFeijao, pCafe, pYpe, pDove, pSuco, pIogurte] = insertedProducts

    await db.insert(schema.productBatches).values([
      // Lote normal
      {
        productId: pCoca.id,
        batchNumber: 'LT-COC-2026-A',
        initialQuantity: '60.000',
        currentQuantity: '60.000',
        costPrice: '7.50',
        manufacturingDate: addDays(today, -30),
        expirationDate: addDays(today, 180),
        active: true
      },
      // Lote Vencendo em 5 dias (Alerta laranja: vencimento próximo <= 7 dias)
      {
        productId: pLeite.id,
        batchNumber: 'LT-LEI-URG-01',
        initialQuantity: '30.000',
        currentQuantity: '30.000',
        costPrice: '4.20',
        manufacturingDate: addDays(today, -60),
        expirationDate: addDays(today, 5),
        active: true
      },
      // Lote normal
      {
        productId: pLeite.id,
        batchNumber: 'LT-LEI-REG-02',
        initialQuantity: '50.000',
        currentQuantity: '50.000',
        costPrice: '4.20',
        manufacturingDate: addDays(today, -10),
        expirationDate: addDays(today, 90),
        active: true
      },
      // Lote Vencendo em 18 dias (Alerta amarelo: <= 30 dias)
      {
        productId: pIogurte.id,
        batchNumber: 'LT-IOG-ATENCAO',
        initialQuantity: '25.000',
        currentQuantity: '25.000',
        costPrice: '2.20',
        manufacturingDate: addDays(today, -20),
        expirationDate: addDays(today, 18),
        active: true
      },
      // Lote Vencido (Alerta vermelho: < hoje)
      {
        productId: pSuco.id,
        batchNumber: 'LT-SUC-VENCIDO',
        initialQuantity: '5.000',
        currentQuantity: '5.000',
        costPrice: '7.00',
        manufacturingDate: addDays(today, -45),
        expirationDate: addDays(today, -3),
        active: true
      },
      // Lote normal Arroz
      {
        productId: pArroz.id,
        batchNumber: 'LT-ARR-2026-01',
        initialQuantity: '40.000',
        currentQuantity: '40.000',
        costPrice: '22.00',
        manufacturingDate: addDays(today, -15),
        expirationDate: addDays(today, 365),
        active: true
      },
      // Lote normal Feijão
      {
        productId: pFeijao.id,
        batchNumber: 'LT-FEI-2026-01',
        initialQuantity: '50.000',
        currentQuantity: '50.000',
        costPrice: '6.10',
        manufacturingDate: addDays(today, -10),
        expirationDate: addDays(today, 300),
        active: true
      }
    ])

    // 8. Registrar Movimentações Iniciais de Estoque (ENTRY)
    console.log('Registrando histórico de movimentações iniciais...')
    for (const prod of insertedProducts) {
      await db.insert(schema.stockMovements).values({
        productId: prod.id,
        userId: admin.id,
        type: 'ENTRY',
        quantity: prod.currentStock,
        previousStock: '0.000',
        newStock: prod.currentStock,
        unitCost: prod.costPrice,
        referenceId: 'INVENTARIO-INICIAL',
        reason: 'Carga inicial de estoque do sistema'
      })
    }

    // 9. Registrar uma Venda de Exemplo no PDV
    console.log('Registrando venda de demonstração...')
    const [venda1] = await db.insert(schema.sales).values({
      code: 'VEN-20261008-0001',
      userId: operator.id,
      customerId: cliMaria.id,
      subtotal: '43.80',
      discount: '0.00',
      total: '43.80',
      paymentMethod: 'PIX',
      status: 'COMPLETED',
      notes: 'Venda balcão PDV com leitor'
    }).returning()

    // Itens: 2x Coca-Cola (2 x 11.90 = 23.80), 1x Arroz (31.90) - opa, ajustando total
    // 2x Coca-Cola (23.80) + 1x Cafe (19.90) + 1x Sabonete (4.50) = 48.20
    await db.insert(schema.saleItems).values([
      {
        saleId: venda1.id,
        productId: pCoca.id,
        quantity: '2.000',
        unitPrice: '11.90',
        costPrice: '7.50',
        subtotal: '23.80'
      },
      {
        saleId: venda1.id,
        productId: pCafe.id,
        quantity: '1.000',
        unitPrice: '19.90',
        costPrice: '14.50',
        subtotal: '19.90'
      }
    ])

    // Movimentação de saída para a venda
    await db.insert(schema.stockMovements).values([
      {
        productId: pCoca.id,
        userId: operator.id,
        type: 'SALE',
        quantity: '-2.000',
        previousStock: '62.000',
        newStock: '60.000',
        unitCost: '7.50',
        referenceId: venda1.code,
        reason: `Venda ${venda1.code} realizada no PDV`
      },
      {
        productId: pCafe.id,
        userId: operator.id,
        type: 'SALE',
        quantity: '-1.000',
        previousStock: '36.000',
        newStock: '35.000',
        unitCost: '14.50',
        referenceId: venda1.code,
        reason: `Venda ${venda1.code} realizada no PDV`
      }
    ])

    console.log('✅ Seed executado com sucesso!')
    console.log('Credenciais para login:')
    console.log('Admin: admin@estoque.com / admin123')
    console.log('Gerente: gerente@estoque.com / gerente123')
    console.log('Operador: operador@estoque.com / operador123')

    await client.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    await client.end()
    process.exit(1)
  }
}

seed()
