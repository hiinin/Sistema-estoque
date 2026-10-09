import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  date,
  integer,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. Usuários e Perfis
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('OPERATOR'), // 'ADMIN' | 'MANAGER' | 'OPERATOR'
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
})

// 2. Categorias
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
})

// 3. Fornecedores
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cnpj: varchar('cnpj', { length: 20 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
})

// 4. Clientes
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cpf: varchar('cpf', { length: 20 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
})

// 5. Produtos
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  barcode: varchar('barcode', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'restrict' }),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  salePrice: numeric('sale_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currentStock: numeric('current_stock', { precision: 12, scale: 3 }).notNull().default('0.000'),
  minimumStock: numeric('minimum_stock', { precision: 12, scale: 3 }).notNull().default('0.000'),
  maximumStock: numeric('maximum_stock', { precision: 12, scale: 3 }).notNull().default('0.000'),
  unit: varchar('unit', { length: 20 }).notNull().default('UN'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_products_barcode').on(table.barcode),
  index('idx_products_sku').on(table.sku),
  index('idx_products_name').on(table.name),
  index('idx_products_category').on(table.categoryId)
])

// 6. Lotes e Controle de Validade
export const productBatches = pgTable('product_batches', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  batchNumber: varchar('batch_number', { length: 100 }).notNull(),
  initialQuantity: numeric('initial_quantity', { precision: 12, scale: 3 }).notNull(),
  currentQuantity: numeric('current_quantity', { precision: 12, scale: 3 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  manufacturingDate: date('manufacturing_date', { mode: 'string' }),
  expirationDate: date('expiration_date', { mode: 'string' }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_batches_product').on(table.productId),
  index('idx_batches_expiration').on(table.expirationDate)
])

// 7. Entradas / Compras de Estoque
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  supplierId: integer('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0.00'),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_purchases_supplier').on(table.supplierId),
  index('idx_purchases_created').on(table.createdAt)
])

// 8. Itens da Compra
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }),
  manufacturingDate: date('manufacturing_date', { mode: 'string' }),
  expirationDate: date('expiration_date', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_purchase_items_purchase').on(table.purchaseId),
  index('idx_purchase_items_product').on(table.productId)
])

// 9. Sessões de Caixa (Abertura, Fechamento e Auditoria de Valores)
export const cashRegisters = pgTable('cash_registers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: varchar('status', { length: 20 }).notNull().default('OPEN'), // 'OPEN' | 'CLOSED'
  openingAmount: numeric('opening_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  closingAmount: numeric('closing_amount', { precision: 12, scale: 2 }),
  expectedAmount: numeric('expected_amount', { precision: 12, scale: 2 }),
  differenceAmount: numeric('difference_amount', { precision: 12, scale: 2 }),
  notes: text('notes'),
  openedAt: timestamp('opened_at', { mode: 'string' }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_cash_registers_user').on(table.userId),
  index('idx_cash_registers_status').on(table.status),
  index('idx_cash_registers_opened').on(table.openedAt)
])

// 10. Vendas
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  cashRegisterId: integer('cash_register_id').references(() => cashRegisters.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(), // 'MONEY' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'
  status: varchar('status', { length: 50 }).notNull().default('COMPLETED'), // 'COMPLETED' | 'CANCELLED'
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_sales_user').on(table.userId),
  index('idx_sales_cash_register').on(table.cashRegisterId),
  index('idx_sales_customer').on(table.customerId),
  index('idx_sales_created').on(table.createdAt)
])

// 11. Itens da Venda
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  batchId: integer('batch_id').references(() => productBatches.id, { onDelete: 'set null' }),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_sale_items_sale').on(table.saleId),
  index('idx_sale_items_product').on(table.productId)
])

// 12. Movimentações de Estoque (Auditoria e Rastreabilidade Total)
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  batchId: integer('batch_id').references(() => productBatches.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 50 }).notNull(), // 'ENTRY' | 'SALE' | 'ADJUSTMENT' | 'LOSS' | 'RETURN' | 'PURCHASE'
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  previousStock: numeric('previous_stock', { precision: 12, scale: 3 }).notNull(),
  newStock: numeric('new_stock', { precision: 12, scale: 3 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
  referenceId: varchar('reference_id', { length: 100 }),
  reason: text('reason'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_movements_product').on(table.productId),
  index('idx_movements_type').on(table.type),
  index('idx_movements_created').on(table.createdAt)
])

// 13. Movimentações e Lançamentos de Caixa (Sangria, Suprimento, etc.)
export const cashMovements = pgTable('cash_movements', {
  id: serial('id').primaryKey(),
  cashRegisterId: integer('cash_register_id').notNull().references(() => cashRegisters.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  type: varchar('type', { length: 30 }).notNull(), // 'OPENING' | 'REINFORCEMENT' | 'BLEED' | 'SALE' | 'CLOSING'
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('MONEY'),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow()
}, (table) => [
  index('idx_cash_movements_register').on(table.cashRegisterId),
  index('idx_cash_movements_type').on(table.type),
  index('idx_cash_movements_created').on(table.createdAt)
])

// RELACIONAMENTOS DRIZZLE
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  purchases: many(purchases),
  stockMovements: many(stockMovements),
  cashRegisters: many(cashRegisters),
  cashMovements: many(cashMovements)
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products)
}))

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchases: many(purchases)
}))

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales)
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id]
  }),
  batches: many(productBatches),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  movements: many(stockMovements)
}))

export const productBatchesRelations = relations(productBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [productBatches.productId],
    references: [products.id]
  }),
  saleItems: many(saleItems),
  movements: many(stockMovements)
}))

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id]
  }),
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id]
  }),
  items: many(purchaseItems)
}))

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id]
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id]
  })
}))

export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id]
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id]
  }),
  cashRegister: one(cashRegisters, {
    fields: [sales.cashRegisterId],
    references: [cashRegisters.id]
  }),
  items: many(saleItems)
}))

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id]
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id]
  }),
  batch: one(productBatches, {
    fields: [saleItems.batchId],
    references: [productBatches.id]
  })
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id]
  }),
  batch: one(productBatches, {
    fields: [stockMovements.batchId],
    references: [productBatches.id]
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id]
  })
}))

export const cashRegistersRelations = relations(cashRegisters, ({ one, many }) => ({
  user: one(users, {
    fields: [cashRegisters.userId],
    references: [users.id]
  }),
  movements: many(cashMovements),
  sales: many(sales)
}))

export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  cashRegister: one(cashRegisters, {
    fields: [cashMovements.cashRegisterId],
    references: [cashRegisters.id]
  }),
  user: one(users, {
    fields: [cashMovements.userId],
    references: [users.id]
  })
}))

