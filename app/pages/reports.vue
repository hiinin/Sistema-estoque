<script setup lang="ts">
import {
  BarChart3,
  ShoppingCart,
  Boxes,
  CalendarClock,
  History,
  Download,
  Printer,
  Filter,
  Search,
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ArrowUpDown
} from 'lucide-vue-next'

const activeTab = ref<'sales' | 'stock' | 'movements' | 'batches'>('sales')

// --- FILTROS DE VENDAS ---
const salesFilters = ref({
  startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  paymentMethod: '',
  status: 'ALL'
})

// --- FILTROS DE ESTOQUE ---
const stockFilters = ref({
  categoryId: '',
  supplierId: '',
  status: 'ALL',
  search: ''
})

// --- FILTROS DE MOVIMENTAÇÕES ---
const movementsFilters = ref({
  startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  type: 'ALL'
})

// --- FILTROS DE LOTES ---
const batchFilters = ref({
  status: 'ALL'
})

// --- CARREGAMENTO DE DADOS AUXILIARES ---
const { data: categoriesData } = await useFetch<{ categories: Array<{ id: number; name: string }> }>('/api/categories')
const { data: suppliersData } = await useFetch<{ suppliers: Array<{ id: number; name: string }> }>('/api/suppliers')

// --- CARREGAMENTO DOS RELATÓRIOS ---
const { data: salesData, refresh: refreshSales, pending: pendingSales } = await useFetch('/api/reports/sales', {
  query: salesFilters,
  watch: [salesFilters]
})

const { data: stockData, refresh: refreshStock, pending: pendingStock } = await useFetch('/api/reports/stock', {
  query: stockFilters,
  watch: [stockFilters]
})

const { data: movementsData, refresh: refreshMovements, pending: pendingMovements } = await useFetch('/api/reports/movements', {
  query: movementsFilters,
  watch: [movementsFilters]
})

const { data: batchesData, refresh: refreshBatches, pending: pendingBatches } = await useFetch('/api/reports/batches', {
  query: batchFilters,
  watch: [batchFilters]
})

const formatCurrency = (val?: number) => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// --- EXPORTAÇÃO CSV COM SUPORTE A UTF-8 E EXCEL ---
const downloadCsv = (filename: string, rows: string[][]) => {
  const csvContent = '\uFEFF' + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportSalesCsv = () => {
  if (!salesData.value?.sales) return
  const headers = ['Código', 'Data/Hora', 'Cliente', 'Operador', 'Forma Pagamento', 'Status', 'Subtotal (R$)', 'Desconto (R$)', 'Total (R$)']
  const rows = [headers, ...salesData.value.sales.map((s: any) => [
    s.code,
    formatDateTime(s.createdAt),
    s.customerName,
    s.userName,
    s.paymentMethod,
    s.status === 'COMPLETED' ? 'Concluída' : 'Cancelada',
    s.subtotal.toFixed(2),
    s.discount.toFixed(2),
    s.total.toFixed(2)
  ])]
  downloadCsv('relatorio_vendas', rows)
}

const exportStockCsv = () => {
  if (!stockData.value?.products) return
  const headers = ['SKU', 'EAN/Código', 'Produto', 'Categoria', 'Fornecedor', 'Estoque Atual', 'Estoque Mín', 'Unidade', 'Custo Unit (R$)', 'Venda Unit (R$)', 'Total Custo (R$)', 'Total Venda (R$)', 'Margem (%)', 'Sugestão Compra']
  const rows = [headers, ...stockData.value.products.map((p: any) => [
    p.sku,
    p.barcode,
    p.name,
    p.categoryName,
    p.supplierName,
    p.currentStock.toString(),
    p.minimumStock.toString(),
    p.unit,
    p.costPrice.toFixed(2),
    p.salePrice.toFixed(2),
    p.subtotalCost.toFixed(2),
    p.subtotalSale.toFixed(2),
    `${p.margin}%`,
    p.suggestedBuy.toString()
  ])]
  downloadCsv('relatorio_posicao_estoque', rows)
}

const exportMovementsCsv = () => {
  if (!movementsData.value?.movements) return
  const headers = ['Data/Hora', 'Tipo', 'Produto', 'SKU', 'Qtd Movimentada', 'Estoque Anterior', 'Novo Estoque', 'Unidade', 'Operador', 'Referência', 'Motivo']
  const rows = [headers, ...movementsData.value.movements.map((m: any) => [
    formatDateTime(m.createdAt),
    m.type,
    m.productName,
    m.sku,
    m.quantity.toString(),
    m.previousStock.toString(),
    m.newStock.toString(),
    m.unit,
    m.userName,
    m.referenceId || '',
    m.reason || ''
  ])]
  downloadCsv('relatorio_movimentacoes_auditoria', rows)
}

const exportBatchesCsv = () => {
  if (!batchesData.value?.batches) return
  const headers = ['Lote', 'Produto', 'SKU', 'Fabricação', 'Validade', 'Dias Restantes', 'Qtd Atual', 'Custo Unit (R$)', 'Total Custo (R$)', 'Status']
  const rows = [headers, ...batchesData.value.batches.map((b: any) => [
    b.batchNumber,
    b.productName,
    b.sku,
    b.manufacturingDate ? formatDate(b.manufacturingDate) : '',
    formatDate(b.expirationDate),
    b.daysDiff.toString(),
    b.currentQuantity.toString(),
    b.costPrice.toFixed(2),
    b.subtotalCost.toFixed(2),
    b.status
  ])]
  downloadCsv('relatorio_lotes_validade', rows)
}

const handlePrint = () => {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Cabeçalho com ações -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 class="h-7 w-7 text-emerald-600" />
          Relatórios & Inteligência de Negócio
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Emita relatórios detalhados de vendas, posição de estoque, auditoria e validades com exportação e impressão.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="handlePrint"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
        >
          <Printer class="h-4 w-4 text-slate-500" />
          <span>Imprimir / PDF</span>
        </button>

        <button
          v-if="activeTab === 'sales'"
          @click="exportSalesCsv"
          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
        >
          <Download class="h-4 w-4" />
          <span>Exportar CSV</span>
        </button>

        <button
          v-else-if="activeTab === 'stock'"
          @click="exportStockCsv"
          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
        >
          <Download class="h-4 w-4" />
          <span>Exportar CSV</span>
        </button>

        <button
          v-else-if="activeTab === 'movements'"
          @click="exportMovementsCsv"
          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
        >
          <Download class="h-4 w-4" />
          <span>Exportar CSV</span>
        </button>

        <button
          v-else-if="activeTab === 'batches'"
          @click="exportBatchesCsv"
          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
        >
          <Download class="h-4 w-4" />
          <span>Exportar CSV</span>
        </button>
      </div>
    </div>

    <!-- Navegação em Abas -->
    <div class="border-b border-slate-200 print:hidden">
      <nav class="flex space-x-2 md:space-x-6 overflow-x-auto pb-1" aria-label="Tabs">
        <button
          @click="activeTab = 'sales'"
          :class="[
            activeTab === 'sales'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium',
            'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-2 text-sm transition cursor-pointer'
          ]"
        >
          <ShoppingCart class="h-4 w-4" />
          <span>Vendas & Faturamento</span>
        </button>

        <button
          @click="activeTab = 'stock'"
          :class="[
            activeTab === 'stock'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium',
            'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-2 text-sm transition cursor-pointer'
          ]"
        >
          <Boxes class="h-4 w-4" />
          <span>Posição de Estoque</span>
        </button>

        <button
          @click="activeTab = 'movements'"
          :class="[
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium',
            'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-2 text-sm transition cursor-pointer'
          ]"
        >
          <History class="h-4 w-4" />
          <span>Auditoria de Movimentações</span>
        </button>

        <button
          @click="activeTab = 'batches'"
          :class="[
            activeTab === 'batches'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 font-medium',
            'flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-2 text-sm transition cursor-pointer'
          ]"
        >
          <CalendarClock class="h-4 w-4" />
          <span>Lotes & Validade</span>
        </button>
      </nav>
    </div>

    <!-- ==================== ABA 1: VENDAS ==================== -->
    <div v-if="activeTab === 'sales'" class="space-y-6">
      <!-- Filtros -->
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Inicial</label>
            <input
              type="date"
              v-model="salesFilters.startDate"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Final</label>
            <input
              type="date"
              v-model="salesFilters.endDate"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Forma de Pagamento</label>
            <select
              v-model="salesFilters.paymentMethod"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="MONEY">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="DEBIT_CARD">Cartão de Débito</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select
              v-model="salesFilters.status"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todas</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Resumo Financeiro / Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Faturamento Líquido</span>
          <p class="text-2xl font-black text-emerald-600 mt-1">
            {{ formatCurrency(salesData?.summary.totalNet) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            Bruto: {{ formatCurrency(salesData?.summary.totalGross) }} (Descontos: {{ formatCurrency(salesData?.summary.totalDiscounts) }})
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Lucro Estimado</span>
          <p class="text-2xl font-black text-blue-600 mt-1">
            {{ formatCurrency(salesData?.summary.totalProfit) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Margem sobre custo dos itens</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Vendas Realizadas</span>
          <p class="text-2xl font-black text-slate-900 mt-1">
            {{ salesData?.summary.salesCount || 0 }}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            {{ salesData?.summary.totalItems || 0 }} unidades vendidas · {{ salesData?.summary.cancelledCount || 0 }} canceladas
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Ticket Médio</span>
          <p class="text-2xl font-black text-slate-900 mt-1">
            {{ formatCurrency(salesData?.summary.avgTicket) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Média por venda concluída</p>
        </div>
      </div>

      <!-- Tabela de Vendas -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Código</th>
                <th class="px-4 py-3">Data / Hora</th>
                <th class="px-4 py-3">Cliente</th>
                <th class="px-4 py-3">Operador</th>
                <th class="px-4 py-3">Pagamento</th>
                <th class="px-4 py-3">Itens</th>
                <th class="px-4 py-3 text-right">Total</th>
                <th class="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-for="sale in salesData?.sales" :key="sale.id" class="hover:bg-slate-50/70 transition">
                <td class="px-4 py-3 font-mono font-bold text-slate-900">{{ sale.code }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ formatDateTime(sale.createdAt) }}</td>
                <td class="px-4 py-3 font-medium">{{ sale.customerName }}</td>
                <td class="px-4 py-3 text-xs">{{ sale.userName }}</td>
                <td class="px-4 py-3 text-xs font-semibold">{{ sale.paymentMethod }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ sale.items.length }} item(ns)</td>
                <td class="px-4 py-3 text-right font-bold text-slate-900">{{ formatCurrency(sale.total) }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    :class="sale.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ sale.status === 'COMPLETED' ? 'Concluída' : 'Cancelada' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!salesData?.sales?.length">
                <td colspan="8" class="text-center py-8 text-slate-400">Nenhuma venda encontrada para os filtros selecionados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== ABA 2: ESTOQUE ==================== -->
    <div v-if="activeTab === 'stock'" class="space-y-6">
      <!-- Filtros -->
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Buscar Produto / SKU / EAN</label>
            <input
              type="text"
              v-model="stockFilters.search"
              placeholder="Digite para filtrar..."
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
            <select
              v-model="stockFilters.categoryId"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Todas as Categorias</option>
              <option v-for="c in categoriesData?.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Fornecedor</label>
            <select
              v-model="stockFilters.supplierId"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Todos os Fornecedores</option>
              <option v-for="s in suppliersData?.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Situação do Estoque</label>
            <select
              v-model="stockFilters.status"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todos os Produtos</option>
              <option value="LOW">Estoque Baixo</option>
              <option value="OUT_OF_STOCK">Esgotados</option>
              <option value="NORMAL">Estoque Normal</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Resumo Estoque / Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Capital Imobilizado (Custo)</span>
          <p class="text-2xl font-black text-slate-900 mt-1">
            {{ formatCurrency(stockData?.summary.totalCostValue) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Custo total dos produtos em estoque</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Potencial de Venda</span>
          <p class="text-2xl font-black text-emerald-600 mt-1">
            {{ formatCurrency(stockData?.summary.totalSaleValue) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Lucro bruto projetado: {{ formatCurrency(stockData?.summary.potentialProfit) }}</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Volume em Estoque</span>
          <p class="text-2xl font-black text-slate-900 mt-1">
            {{ stockData?.summary.totalUnits }} un
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ stockData?.summary.totalProducts }} produtos listados</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Alertas de Reposição</span>
          <p class="text-2xl font-black text-amber-600 mt-1">
            {{ (stockData?.summary.lowStockCount || 0) + (stockData?.summary.outOfStockCount || 0) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">
            {{ stockData?.summary.lowStockCount || 0 }} baixos · {{ stockData?.summary.outOfStockCount || 0 }} zerados
          </p>
        </div>
      </div>

      <!-- Tabela de Estoque -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">SKU / EAN</th>
                <th class="px-4 py-3">Produto</th>
                <th class="px-4 py-3">Categoria</th>
                <th class="px-4 py-3 text-right">Custo Unit</th>
                <th class="px-4 py-3 text-right">Venda Unit</th>
                <th class="px-4 py-3 text-center">Estoque Atual</th>
                <th class="px-4 py-3 text-right">Subtotal Custo</th>
                <th class="px-4 py-3 text-center">Sugestão Compra</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-for="prod in stockData?.products" :key="prod.id" class="hover:bg-slate-50/70 transition">
                <td class="px-4 py-3 font-mono text-xs">
                  <div class="font-bold text-slate-800">{{ prod.sku }}</div>
                  <div class="text-[11px] text-slate-400">{{ prod.barcode }}</div>
                </td>
                <td class="px-4 py-3 font-medium text-slate-900">{{ prod.name }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ prod.categoryName }}</td>
                <td class="px-4 py-3 text-right text-xs">{{ formatCurrency(prod.costPrice) }}</td>
                <td class="px-4 py-3 text-right font-semibold text-slate-900">{{ formatCurrency(prod.salePrice) }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="font-bold text-sm"
                    :class="{
                      'text-rose-600': prod.stockStatus === 'OUT_OF_STOCK',
                      'text-amber-600': prod.stockStatus === 'LOW',
                      'text-slate-800': prod.stockStatus === 'NORMAL'
                    }"
                  >
                    {{ prod.currentStock }} {{ prod.unit }}
                  </span>
                  <div class="text-[10px] text-slate-400">Mín: {{ prod.minimumStock }}</div>
                </td>
                <td class="px-4 py-3 text-right font-bold text-slate-900">{{ formatCurrency(prod.subtotalCost) }}</td>
                <td class="px-4 py-3 text-center">
                  <span v-if="prod.suggestedBuy > 0" class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                    +{{ prod.suggestedBuy }} {{ prod.unit }}
                  </span>
                  <span v-else class="text-xs text-slate-400">-</span>
                </td>
              </tr>
              <tr v-if="!stockData?.products?.length">
                <td colspan="8" class="text-center py-8 text-slate-400">Nenhum produto corresponde aos filtros informados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== ABA 3: AUDITORIA DE MOVIMENTAÇÕES ==================== -->
    <div v-if="activeTab === 'movements'" class="space-y-6">
      <!-- Filtros -->
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Inicial</label>
            <input
              type="date"
              v-model="movementsFilters.startDate"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Data Final</label>
            <input
              type="date"
              v-model="movementsFilters.endDate"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tipo de Movimento</label>
            <select
              v-model="movementsFilters.type"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="ENTRY">Entrada Avulsa</option>
              <option value="PURCHASE">Compra de Fornecedor</option>
              <option value="SALE">Venda no PDV</option>
              <option value="LOSS">Perda / Avaria / Descarte</option>
              <option value="ADJUSTMENT">Ajuste de Inventário</option>
              <option value="RETURN">Estorno de Devolução</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabela de Movimentações -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Data / Hora</th>
                <th class="px-4 py-3">Tipo</th>
                <th class="px-4 py-3">Produto</th>
                <th class="px-4 py-3 text-center">Quantidade</th>
                <th class="px-4 py-3 text-center">Estoque Antes &rarr; Depois</th>
                <th class="px-4 py-3">Responsável</th>
                <th class="px-4 py-3">Motivo / Referência</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-for="mov in movementsData?.movements" :key="mov.id" class="hover:bg-slate-50/70 transition">
                <td class="px-4 py-3 text-xs text-slate-500">{{ formatDateTime(mov.createdAt) }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-md border px-2 py-0.5 text-xs font-bold"
                    :class="{
                      'bg-emerald-50 text-emerald-700 border-emerald-200': mov.type === 'ENTRY' || mov.type === 'PURCHASE' || mov.type === 'RETURN',
                      'bg-blue-50 text-blue-700 border-blue-200': mov.type === 'SALE',
                      'bg-rose-50 text-rose-700 border-rose-200': mov.type === 'LOSS',
                      'bg-amber-50 text-amber-700 border-amber-200': mov.type === 'ADJUSTMENT'
                    }"
                  >
                    {{ mov.type }}
                  </span>
                </td>
                <td class="px-4 py-3 font-semibold text-slate-900">{{ mov.productName }}</td>
                <td class="px-4 py-3 text-center font-bold">{{ mov.quantity }} {{ mov.unit }}</td>
                <td class="px-4 py-3 text-center font-mono text-xs">
                  {{ mov.previousStock }} &rarr; <span class="font-bold text-slate-900">{{ mov.newStock }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-600">{{ mov.userName }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ mov.reason || mov.referenceId || '-' }}</td>
              </tr>
              <tr v-if="!movementsData?.movements?.length">
                <td colspan="7" class="text-center py-8 text-slate-400">Nenhuma movimentação registrada no período selecionado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== ABA 4: LOTES E VALIDADES ==================== -->
    <div v-if="activeTab === 'batches'" class="space-y-6">
      <!-- Filtros -->
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div class="flex items-center gap-3">
          <label class="text-xs font-semibold text-slate-600">Filtrar por Situação:</label>
          <select
            v-model="batchFilters.status"
            class="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">Todos os Lotes</option>
            <option value="EXPIRED">🔴 Vencidos</option>
            <option value="EXPIRING_7">🟠 Vence em até 7 dias</option>
            <option value="EXPIRING_30">🟡 Vence em até 30 dias</option>
            <option value="REGULAR">🟢 Validade Regular</option>
          </select>
        </div>
      </div>

      <!-- Resumo de Lotes / Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Prejuízo com Vencidos</span>
          <p class="text-2xl font-black text-rose-600 mt-1">
            {{ formatCurrency(batchesData?.summary.expiredValue) }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ batchesData?.summary.expiredCount || 0 }} lotes vencidos</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Vencendo em 7 Dias</span>
          <p class="text-2xl font-black text-orange-600 mt-1">
            {{ batchesData?.summary.expiring7Count || 0 }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Atenção máxima para queima</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Vencendo em 30 Dias</span>
          <p class="text-2xl font-black text-amber-600 mt-1">
            {{ batchesData?.summary.expiring30Count || 0 }}
          </p>
          <p class="text-xs text-slate-400 mt-1">Em monitoramento</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span class="text-xs font-bold text-slate-500 uppercase">Total de Lotes Ativos</span>
          <p class="text-2xl font-black text-slate-900 mt-1">
            {{ batchesData?.summary.totalBatches || 0 }}
          </p>
          <p class="text-xs text-slate-400 mt-1">{{ batchesData?.summary.regularCount || 0 }} com validade tranquila</p>
        </div>
      </div>

      <!-- Tabela de Lotes -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Lote</th>
                <th class="px-4 py-3">Produto</th>
                <th class="px-4 py-3">Fabricação</th>
                <th class="px-4 py-3">Validade</th>
                <th class="px-4 py-3 text-center">Dias Restantes</th>
                <th class="px-4 py-3 text-center">Quantidade</th>
                <th class="px-4 py-3 text-right">Custo Total</th>
                <th class="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-for="b in batchesData?.batches" :key="b.id" class="hover:bg-slate-50/70 transition">
                <td class="px-4 py-3 font-mono font-bold text-slate-900">{{ b.batchNumber }}</td>
                <td class="px-4 py-3 font-medium">{{ b.productName }}</td>
                <td class="px-4 py-3 text-xs text-slate-500">{{ b.manufacturingDate ? formatDate(b.manufacturingDate) : '-' }}</td>
                <td class="px-4 py-3 font-semibold text-slate-900">{{ formatDate(b.expirationDate) }}</td>
                <td class="px-4 py-3 text-center font-bold" :class="b.daysDiff < 0 ? 'text-rose-600' : b.daysDiff <= 7 ? 'text-orange-600' : 'text-slate-700'">
                  {{ b.daysDiff < 0 ? `${Math.abs(b.daysDiff)} dias atrás` : `${b.daysDiff} dias` }}
                </td>
                <td class="px-4 py-3 text-center font-bold">{{ b.currentQuantity }} {{ b.unit }}</td>
                <td class="px-4 py-3 text-right font-bold text-slate-900">{{ formatCurrency(b.subtotalCost) }}</td>
                <td class="px-4 py-3 text-center">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    :class="{
                      'bg-rose-100 text-rose-800': b.status === 'EXPIRED',
                      'bg-orange-100 text-orange-800': b.status === 'EXPIRING_7',
                      'bg-amber-100 text-amber-800': b.status === 'EXPIRING_30',
                      'bg-emerald-100 text-emerald-800': b.status === 'REGULAR'
                    }"
                  >
                    {{ b.status === 'EXPIRED' ? 'Vencido' : b.status === 'EXPIRING_7' ? 'Vence em 7d' : b.status === 'EXPIRING_30' ? 'Vence em 30d' : 'Regular' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!batchesData?.batches?.length">
                <td colspan="8" class="text-center py-8 text-slate-400">Nenhum lote corresponde aos filtros informados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
