<script setup lang="ts">
import {
  Boxes,
  ShoppingCart,
  Package,
  CalendarClock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  QrCode,
  CreditCard,
  Banknote,
  Wallet,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  Award,
  Layers,
  ChevronRight
} from 'lucide-vue-next'

const { user } = useAuth()

interface DashboardData {
  metrics: {
    today: {
      revenue: number
      count: number
      itemsSold: number
      avgTicket: number
    }
    month: {
      revenue: number
      count: number
      estimatedProfit: number
    }
    stock: {
      totalProducts: number
      lowStockCount: number
      totalCost: number
      totalSaleValue: number
      potentialMargin: number
    }
    expiration: {
      expiredCount: number
      expiring7DaysCount: number
      expiring30DaysCount: number
      totalAttention: number
    }
  }
  charts: {
    last7Days: Array<{
      date: string
      label: string
      total: number
      count: number
    }>
    paymentDistribution: Array<{
      key: string
      label: string
      total: number
      count: number
      percentage: number
    }>
    topProducts: Array<{
      id: number
      name: string
      sku: string
      quantity: number
      revenue: number
    }>
    categoryDistribution: Array<{
      name: string
      revenue: number
      quantity: number
    }>
  }
  lowStockAlerts: Array<{
    id: number
    name: string
    sku: string
    barcode: string
    currentStock: number
    minimumStock: number
    unit: string
    categoryName: string
    isOutOfStock: boolean
  }>
  recentSales: Array<{
    id: number
    code: string
    total: number
    paymentMethod: string
    itemsCount: number
    userName: string
    customerName: string
    createdAt: string
  }>
  recentMovements: Array<{
    id: number
    type: string
    productName: string
    unit: string
    quantity: number
    previousStock: number
    newStock: number
    userName: string
    reason?: string
    createdAt: string
  }>
}

const { data, pending, refresh } = await useFetch<DashboardData>('/api/dashboard')

const isRefreshing = ref(false)
const handleRefresh = async () => {
  isRefreshing.value = true
  await refresh()
  setTimeout(() => {
    isRefreshing.value = false
  }, 400)
}

const formatCurrency = (val?: number) => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const max7DaysTotal = computed(() => {
  if (!data.value?.charts.last7Days?.length) return 100
  const max = Math.max(...data.value.charts.last7Days.map(d => d.total))
  return max > 0 ? max : 100
})

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'PIX': return QrCode
    case 'CREDIT_CARD': return CreditCard
    case 'DEBIT_CARD': return CreditCard
    case 'MONEY': return Banknote
    default: return Wallet
  }
}

const getPaymentBadgeClass = (method: string) => {
  switch (method) {
    case 'PIX': return 'bg-teal-50 text-teal-700 border-teal-200'
    case 'CREDIT_CARD': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'DEBIT_CARD': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'MONEY': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    default: return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

const getMovementBadgeClass = (type: string) => {
  switch (type) {
    case 'ENTRY':
    case 'PURCHASE':
    case 'RETURN':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'SALE':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'LOSS':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'ADJUSTMENT':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

const getMovementLabel = (type: string) => {
  switch (type) {
    case 'ENTRY': return 'Entrada'
    case 'PURCHASE': return 'Compra'
    case 'RETURN': return 'Estorno'
    case 'SALE': return 'Venda'
    case 'LOSS': return 'Avaria'
    case 'ADJUSTMENT': return 'Ajuste'
    default: return type
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header Banner -->
    <div class="rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
      <div class="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none"></div>
      
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-medium text-emerald-200 backdrop-blur-xs">
              <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Painel Gerencial em Tempo Real
            </span>
            <button
              @click="handleRefresh"
              :disabled="pending || isRefreshing"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white transition cursor-pointer"
              title="Recarregar Indicadores"
            >
              <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isRefreshing || pending }" />
              <span>Atualizar</span>
            </button>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">
            Olá, {{ user?.name || 'Administrador' }}! 👋
          </h1>
          <p class="text-emerald-100/90 text-sm mt-1 max-w-xl">
            Acompanhe a performance de vendas, status de estoque, alertas de validade e movimentações financeiras em tempo real.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <NuxtLink
            to="/stock"
            class="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 transition cursor-pointer"
          >
            <Boxes class="h-4 w-4" />
            <span>Gerenciar Estoque</span>
          </NuxtLink>

          <NuxtLink
            to="/pos"
            class="inline-flex items-center gap-2 rounded-xl bg-emerald-400 text-emerald-950 px-5 py-3 text-sm font-bold shadow-lg shadow-emerald-950/20 hover:bg-emerald-300 transition cursor-pointer"
          >
            <ShoppingCart class="h-4 w-4 text-emerald-950" />
            <span>Abrir Caixa / PDV</span>
            <ArrowUpRight class="h-4 w-4" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Indicadores Principais (KPIs) -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- 1. Vendas Hoje -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendas Hoje</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-black text-slate-900 mt-2">
          {{ formatCurrency(data?.metrics.today.revenue) }}
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>{{ data?.metrics.today.count || 0 }} vendas concluídas</span>
          <span class="font-medium text-emerald-700">Méd: {{ formatCurrency(data?.metrics.today.avgTicket) }}</span>
        </div>
      </div>

      <!-- 2. Faturamento Mensal -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento no Mês</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <DollarSign class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-black text-slate-900 mt-2">
          {{ formatCurrency(data?.metrics.month.revenue) }}
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>{{ data?.metrics.month.count || 0 }} vendas no mês</span>
          <span class="font-medium text-blue-700">Lucro: {{ formatCurrency(data?.metrics.month.estimatedProfit) }}</span>
        </div>
      </div>

      <!-- 3. Valor do Estoque -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor do Estoque</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Package class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-black text-slate-900 mt-2">
          {{ formatCurrency(data?.metrics.stock.totalSaleValue) }}
        </p>
        <div class="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>Custo: {{ formatCurrency(data?.metrics.stock.totalCost) }}</span>
          <span class="font-semibold text-violet-700">Margem: {{ data?.metrics.stock.potentialMargin?.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- 4. Alertas de Atenção (Estoque & Validade) -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md transition">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas de Atenção</span>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle class="h-5 w-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-2 mt-2">
          <p class="text-2xl font-black text-amber-600">
            {{ (data?.metrics.stock.lowStockCount || 0) + (data?.metrics.expiration.totalAttention || 0) }}
          </p>
          <span class="text-xs text-slate-400 font-medium">ocorrências</span>
        </div>
        <div class="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <NuxtLink to="/products" class="text-amber-700 hover:underline font-medium">
            {{ data?.metrics.stock.lowStockCount || 0 }} estoque baixo
          </NuxtLink>
          <NuxtLink to="/stock" class="text-orange-700 hover:underline font-medium">
            {{ data?.metrics.expiration.totalAttention || 0 }} validades
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Seção de Gráficos e Distribuições -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Gráfico de Vendas últimos 7 dias (2 colunas) -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-base font-bold text-slate-900">Vendas nos Últimos 7 Dias</h2>
            <p class="text-xs text-slate-500">Volume diário de faturamento e quantidade de cupons</p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            Total 7d: {{ formatCurrency(data?.charts.last7Days?.reduce((acc, d) => acc + d.total, 0)) }}
          </span>
        </div>

        <div class="h-64 flex items-end justify-between gap-2 md:gap-4 pt-8 pb-2 px-2">
          <div
            v-for="(day, idx) in data?.charts.last7Days"
            :key="idx"
            class="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
          >
            <!-- Tooltip flutuante no hover -->
            <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none whitespace-nowrap z-20">
              {{ formatCurrency(day.total) }} ({{ day.count }} vendas)
            </div>

            <!-- Barra -->
            <div class="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-full">
              <div
                class="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl transition-all duration-500 group-hover:brightness-110"
                :style="{ height: `${Math.max((day.total / max7DaysTotal) * 100, day.total > 0 ? 8 : 2)}%` }"
              ></div>
            </div>

            <!-- Rótulo do Dia -->
            <span class="text-[11px] font-medium text-slate-600 text-center uppercase truncate w-full">
              {{ day.label }}
            </span>
          </div>
        </div>
      </div>

      <!-- Distribuição de Métodos de Pagamento (1 coluna) -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-slate-900">Formas de Pagamento</h2>
            <span class="text-xs font-medium text-slate-400">Neste Mês</span>
          </div>
          <p class="text-xs text-slate-500 mb-5">Participação dos métodos no faturamento total</p>

          <div class="space-y-4">
            <div
              v-for="item in data?.charts.paymentDistribution"
              :key="item.key"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <component :is="getPaymentIcon(item.key)" class="h-4 w-4 text-slate-600" />
                  <span class="font-semibold text-slate-800">{{ item.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900">{{ formatCurrency(item.total) }}</span>
                  <span class="text-[11px] font-medium text-slate-500">({{ item.percentage }}%)</span>
                </div>
              </div>

              <!-- Barra de Progresso -->
              <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  :style="{ width: `${item.percentage}%` }"
                ></div>
              </div>
            </div>

            <div v-if="!data?.charts.paymentDistribution?.length" class="text-center py-8 text-xs text-slate-400">
              Nenhuma venda registrada no período.
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total Vendas</span>
          <span class="font-bold text-slate-900">{{ formatCurrency(data?.metrics.month.revenue) }}</span>
        </div>
      </div>
    </div>

    <!-- Seção: Top Produtos & Alertas Críticos -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Top 5 Produtos Mais Vendidos -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Award class="h-5 w-5 text-amber-500" />
            <h2 class="text-base font-bold text-slate-900">Top 5 Produtos Mais Vendidos</h2>
          </div>
          <span class="text-xs text-slate-500">Por volume</span>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="(prod, idx) in data?.charts.topProducts"
            :key="prod.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shrink-0"
                :class="{
                  'bg-amber-100 text-amber-800': idx === 0,
                  'bg-slate-200 text-slate-700': idx === 1,
                  'bg-amber-50 text-amber-900': idx === 2,
                  'bg-slate-100 text-slate-500': idx > 2
                }"
              >
                #{{ idx + 1 }}
              </span>
              <div>
                <p class="text-sm font-semibold text-slate-900 leading-tight">{{ prod.name }}</p>
                <p class="text-xs text-slate-400 font-mono">SKU: {{ prod.sku }}</p>
              </div>
            </div>

            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-emerald-700">{{ prod.quantity }} un</p>
              <p class="text-xs text-slate-400">{{ formatCurrency(prod.revenue) }}</p>
            </div>
          </div>

          <div v-if="!data?.charts.topProducts?.length" class="py-8 text-center text-xs text-slate-400">
            Nenhum produto vendido até o momento.
          </div>
        </div>
      </div>

      <!-- Alertas de Estoque Baixo / Reposição Urgente -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-rose-500" />
            <h2 class="text-base font-bold text-slate-900">Produtos para Reposição Urgente</h2>
          </div>
          <NuxtLink to="/products" class="text-xs font-semibold text-emerald-600 hover:underline">
            Ver Todos
          </NuxtLink>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="item in data?.lowStockAlerts"
            :key="item.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-900">{{ item.name }}</span>
                <span
                  v-if="item.isOutOfStock"
                  class="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
                >
                  ESGOTADO
                </span>
                <span
                  v-else
                  class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                >
                  BAIXO
                </span>
              </div>
              <p class="text-xs text-slate-400 font-mono">
                EAN: {{ item.barcode }} · Categoria: {{ item.categoryName }}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p
                class="text-sm font-bold"
                :class="item.isOutOfStock ? 'text-rose-600' : 'text-amber-600'"
              >
                {{ item.currentStock }} / Mín: {{ item.minimumStock }} {{ item.unit }}
              </p>
              <NuxtLink
                :to="`/stock?product=${item.id}`"
                class="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Dar entrada &rarr;
              </NuxtLink>
            </div>
          </div>

          <div v-if="!data?.lowStockAlerts?.length" class="py-8 text-center text-xs text-slate-400">
            <CheckCircle2 class="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            Nenhum produto abaixo do estoque mínimo. Todos abastecidos!
          </div>
        </div>
      </div>
    </div>

    <!-- Seção: Últimas Vendas & Histórico de Movimentações -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Últimas Vendas do PDV -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-900">Últimas Vendas Concluídas</h2>
          <NuxtLink to="/pos" class="text-xs font-semibold text-emerald-600 hover:underline">
            Ir para PDV
          </NuxtLink>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="sale in data?.recentSales"
            :key="sale.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold text-slate-800">{{ sale.code }}</span>
                <span class="rounded-md border px-1.5 py-0.2 text-[10px] font-bold" :class="getPaymentBadgeClass(sale.paymentMethod)">
                  {{ sale.paymentMethod }}
                </span>
              </div>
              <p class="text-xs text-slate-500">
                {{ sale.customerName }} · Operador: {{ sale.userName }}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-slate-900">{{ formatCurrency(sale.total) }}</p>
              <p class="text-[11px] text-slate-400">{{ formatDateTime(sale.createdAt) }}</p>
            </div>
          </div>

          <div v-if="!data?.recentSales?.length" class="py-8 text-center text-xs text-slate-400">
            Nenhuma venda registrada ainda.
          </div>
        </div>
      </div>

      <!-- Últimas Movimentações de Estoque -->
      <div class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-900">Últimas Movimentações de Estoque</h2>
          <NuxtLink to="/stock" class="text-xs font-semibold text-emerald-600 hover:underline">
            Ver Histórico Completo
          </NuxtLink>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="mov in data?.recentMovements"
            :key="mov.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="rounded-md border px-1.5 py-0.2 text-[10px] font-bold" :class="getMovementBadgeClass(mov.type)">
                  {{ getMovementLabel(mov.type) }}
                </span>
                <span class="text-sm font-semibold text-slate-800 truncate max-w-[180px] sm:max-w-xs">{{ mov.productName }}</span>
              </div>
              <p class="text-xs text-slate-400">
                Por {{ mov.userName }} · {{ mov.reason || 'Movimentação padrão' }}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p class="text-xs font-bold text-slate-900">
                {{ mov.previousStock }} &rarr; {{ mov.newStock }} {{ mov.unit }}
              </p>
              <p class="text-[11px] text-slate-400">{{ formatDateTime(mov.createdAt) }}</p>
            </div>
          </div>

          <div v-if="!data?.recentMovements?.length" class="py-8 text-center text-xs text-slate-400">
            Nenhuma movimentação de estoque registrada.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
