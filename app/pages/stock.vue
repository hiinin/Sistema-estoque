<script setup lang="ts">
import {
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Minus,
  Sliders,
  Calendar,
  Search,
  Filter,
  PackageCheck,
  AlertTriangle,
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Barcode,
  Truck,
  FileText,
  CalendarClock
} from 'lucide-vue-next'

definePageMeta({
  roles: ['ADMIN', 'MANAGER']
})

const activeTab = ref<'inventory' | 'movements' | 'purchase'>('inventory')

// 1. Data for Inventory Tab
const { data: productsData, refresh: refreshProducts, pending: pendingProducts } = await useFetch<{ products: any[] }>('/api/products')
const productsList = computed(() => productsData.value?.products || [])

// 2. Data for Movements Tab
const movementTypeFilter = ref('ALL')
const movementSearch = ref('')
const { data: movementsData, refresh: refreshMovements, pending: pendingMovements } = await useFetch<{ movements: any[] }>('/api/stock/movements', {
  query: computed(() => ({
    type: movementTypeFilter.value,
    q: movementSearch.value || undefined
  }))
})
const movementsList = computed(() => movementsData.value?.movements || [])

// 3. Suppliers for Purchase Tab
const { data: suppliersData } = await useFetch<{ suppliers: any[] }>('/api/suppliers', { query: { active: 'true' } })
const suppliersList = computed(() => suppliersData.value?.suppliers || [])

// Notification message
const successMessage = ref('')
const globalErrorMessage = ref('')

// Modal for Quick Movement (ENTRY, LOSS, ADJUSTMENT)
const isQuickModalOpen = ref(false)
const quickActionType = ref<'ENTRY' | 'LOSS' | 'ADJUSTMENT'>('ENTRY')
const quickProduct = ref<any>(null)
const quickQuantity = ref(1)
const quickReason = ref('')
const quickMode = ref<'DELTA' | 'SET_TOTAL'>('DELTA')
const isSavingQuick = ref(false)
const quickErrorMessage = ref('')

const openQuickModal = (prod: any, type: 'ENTRY' | 'LOSS' | 'ADJUSTMENT') => {
  quickProduct.value = prod
  quickActionType.value = type
  quickQuantity.value = type === 'ADJUSTMENT' ? Number(prod.currentStock) : 1
  quickMode.value = type === 'ADJUSTMENT' ? 'SET_TOTAL' : 'DELTA'
  quickReason.value = type === 'ENTRY' ? 'Reposição rápida de estoque' : type === 'LOSS' ? 'Avaria / Produto danificado' : 'Ajuste de contagem física'
  quickErrorMessage.value = ''
  isQuickModalOpen.value = true
}

const submitQuickMovement = async () => {
  if (!quickProduct.value) return
  isSavingQuick.value = true
  quickErrorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>('/api/stock/adjustment', {
      method: 'POST',
      body: {
        productId: quickProduct.value.id,
        type: quickActionType.value,
        mode: quickMode.value,
        quantity: quickQuantity.value,
        reason: quickReason.value
      }
    })
    isQuickModalOpen.value = false
    successMessage.value = res.message
    await refreshProducts()
    await refreshMovements()
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (err: any) {
    quickErrorMessage.value = err.data?.message || err.message || 'Erro ao registrar movimentação'
  } finally {
    isSavingQuick.value = false
  }
}

// Purchase Tab Form state
const purchaseForm = ref({
  supplierId: null as number | null,
  invoiceNumber: '',
  notes: '',
  items: [
    {
      productId: null as number | null,
      quantity: 10,
      costPrice: 0,
      batchNumber: '',
      manufacturingDate: '',
      expirationDate: ''
    }
  ]
})
const isSavingPurchase = ref(false)
const purchaseErrorMessage = ref('')

const addPurchaseItem = () => {
  purchaseForm.value.items.push({
    productId: null,
    quantity: 10,
    costPrice: 0,
    batchNumber: '',
    manufacturingDate: '',
    expirationDate: ''
  })
}

const removePurchaseItem = (index: number) => {
  if (purchaseForm.value.items.length > 1) {
    purchaseForm.value.items.splice(index, 1)
  }
}

const onProductSelectInPurchase = (itemIndex: number) => {
  const item = purchaseForm.value.items[itemIndex]
  const prod = productsList.value.find(p => p.id === item.productId)
  if (prod) {
    item.costPrice = Number(prod.costPrice)
    if (!item.batchNumber) {
      item.batchNumber = 'LT-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900)
    }
  }
}

const purchaseTotal = computed(() => {
  return purchaseForm.value.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.costPrice)), 0)
})

const submitPurchase = async () => {
  isSavingPurchase.value = true
  purchaseErrorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>('/api/stock/purchases', {
      method: 'POST',
      body: purchaseForm.value
    })
    successMessage.value = res.message
    // Reset form
    purchaseForm.value = {
      supplierId: null,
      invoiceNumber: '',
      notes: '',
      items: [
        {
          productId: null,
          quantity: 10,
          costPrice: 0,
          batchNumber: '',
          manufacturingDate: '',
          expirationDate: ''
        }
      ]
    }
    activeTab.value = 'inventory'
    await refreshProducts()
    await refreshMovements()
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (err: any) {
    purchaseErrorMessage.value = err.data?.message || 'Erro ao registrar entrada de compras'
  } finally {
    isSavingPurchase.value = false
  }
}

const formatMoney = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatNumber = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

const movementTypeBadge = (type: string) => {
  switch (type) {
    case 'ENTRY':
      return { label: 'Entrada Avulsa', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'PURCHASE':
      return { label: 'Compra / NF', class: 'bg-blue-50 text-blue-700 border-blue-200' }
    case 'SALE':
      return { label: 'Venda (PDV)', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    case 'ADJUSTMENT':
      return { label: 'Ajuste / Balanço', class: 'bg-purple-50 text-purple-700 border-purple-200' }
    case 'LOSS':
      return { label: 'Perda / Avaria', class: 'bg-rose-50 text-rose-700 border-rose-200' }
    case 'RETURN':
      return { label: 'Devolução', class: 'bg-amber-50 text-amber-700 border-amber-200' }
    default:
      return { label: type, class: 'bg-slate-50 text-slate-700 border-slate-200' }
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Boxes class="h-7 w-7 text-emerald-600" />
          Controle de Estoque & Movimentações
        </h1>
        <p class="text-sm text-slate-500 mt-1">Rastreabilidade total, balanço de inventário, entradas com NF e perdas</p>
      </div>

      <button
        @click="activeTab = 'purchase'"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        Registrar Entrada / Compra
      </button>
    </div>

    <!-- Success Feedback Alert -->
    <div
      v-if="successMessage"
      class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 animate-in fade-in"
    >
      <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-slate-200">
      <button
        @click="activeTab = 'inventory'"
        :class="[
          'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer',
          activeTab === 'inventory'
            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        ]"
      >
        <PackageCheck class="h-4 w-4" />
        Posição de Estoque
      </button>

      <button
        @click="activeTab = 'movements'"
        :class="[
          'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer',
          activeTab === 'movements'
            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        ]"
      >
        <History class="h-4 w-4" />
        Histórico & Auditoria
      </button>

      <button
        @click="activeTab = 'purchase'"
        :class="[
          'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition cursor-pointer',
          activeTab === 'purchase'
            ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        ]"
      >
        <Truck class="h-4 w-4" />
        Entrada com Lote / NF
      </button>
    </div>

    <!-- TAB 1: Inventory Position -->
    <div v-if="activeTab === 'inventory'" class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div v-if="pendingProducts" class="flex justify-center items-center py-16">
          <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3.5">Código / Produto</th>
                <th class="px-6 py-3.5">Categoria</th>
                <th class="px-6 py-3.5">Custo Unitário</th>
                <th class="px-6 py-3.5">Estoque Atual</th>
                <th class="px-6 py-3.5">Status Nível</th>
                <th class="px-6 py-3.5 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="prod in productsList" :key="prod.id" class="hover:bg-slate-50/80 transition">
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ prod.name }}</div>
                  <div class="font-mono text-xs text-slate-400">Barcode: {{ prod.barcode }} | SKU: {{ prod.sku }}</div>
                </td>
                <td class="px-6 py-4 text-xs font-medium text-slate-700">
                  {{ prod.categoryName || '—' }}
                </td>
                <td class="px-6 py-4 text-xs font-semibold text-slate-900">
                  {{ formatMoney(prod.costPrice) }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-bold text-sm text-slate-900">
                    {{ formatNumber(prod.currentStock) }} {{ prod.unit }}
                  </div>
                  <div class="text-[11px] text-slate-400">
                    Mín: {{ formatNumber(prod.minimumStock) }} | Máx: {{ formatNumber(prod.maximumStock) }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    v-if="Number(prod.currentStock) <= 0"
                    class="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700"
                  >
                    <AlertTriangle class="h-3 w-3" />
                    Estoque Zerado
                  </span>
                  <span
                    v-else-if="Number(prod.currentStock) <= Number(prod.minimumStock)"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700"
                  >
                    <AlertTriangle class="h-3 w-3" />
                    Estoque Baixo
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                  >
                    Normal
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      @click="openQuickModal(prod, 'ENTRY')"
                      class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                      title="Entrada rápida"
                    >
                      <Plus class="h-3.5 w-3.5" />
                      Entrada
                    </button>
                    <button
                      @click="openQuickModal(prod, 'LOSS')"
                      class="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                      title="Registrar perda/avaria"
                    >
                      <Minus class="h-3.5 w-3.5" />
                      Perda
                    </button>
                    <button
                      @click="openQuickModal(prod, 'ADJUSTMENT')"
                      class="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                      title="Ajuste de inventário"
                    >
                      <Sliders class="h-3.5 w-3.5" />
                      Ajustar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: Movements History & Audit Trail -->
    <div v-if="activeTab === 'movements'" class="space-y-4">
      <!-- Filter Bar -->
      <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="relative w-full sm:w-80">
          <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            v-model="movementSearch"
            type="text"
            placeholder="Buscar por produto, barcode ou motivo..."
            class="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
          />
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <span class="text-xs font-medium text-slate-500">Tipo:</span>
          <select
            v-model="movementTypeFilter"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
          >
            <option value="ALL">Todas as Movimentações</option>
            <option value="ENTRY">Entrada Avulsa</option>
            <option value="PURCHASE">Compra / NF</option>
            <option value="SALE">Venda (PDV)</option>
            <option value="ADJUSTMENT">Ajuste de Balanço</option>
            <option value="LOSS">Perda / Avaria</option>
            <option value="RETURN">Devolução</option>
          </select>
        </div>
      </div>

      <!-- Movements Table -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div v-if="pendingMovements" class="flex justify-center items-center py-16">
          <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
        </div>

        <div v-else-if="movementsList.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-4">
          <History class="h-10 w-10 text-slate-300 mb-2" />
          <p class="font-semibold text-slate-800">Nenhuma movimentação encontrada</p>
          <p class="text-xs text-slate-500 mt-1">Todas as entradas, vendas e saídas de estoque ficam registradas aqui com auditoria.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3.5">Data / Hora</th>
                <th class="px-6 py-3.5">Tipo</th>
                <th class="px-6 py-3.5">Produto</th>
                <th class="px-6 py-3.5">Qtd Movimentada</th>
                <th class="px-6 py-3.5">Estoque Anterior → Novo</th>
                <th class="px-6 py-3.5">Operador / Motivo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="m in movementsList" :key="m.id" class="hover:bg-slate-50/80 transition">
                <td class="px-6 py-4 text-xs font-mono text-slate-500">
                  {{ new Date(m.createdAt).toLocaleString('pt-BR') }}
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                      movementTypeBadge(m.type).class
                    ]"
                  >
                    {{ movementTypeBadge(m.type).label }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="font-semibold text-slate-900">{{ m.productName }}</div>
                  <div class="text-[11px] font-mono text-slate-400">Barcode: {{ m.productBarcode }}</div>
                </td>
                <td class="px-6 py-4">
                  <span
                    :class="[
                      'font-bold font-mono text-sm',
                      Number(m.quantity) > 0 ? 'text-emerald-600' : 'text-rose-600'
                    ]"
                  >
                    {{ Number(m.quantity) > 0 ? '+' : '' }}{{ formatNumber(m.quantity) }} {{ m.productUnit }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs font-mono text-slate-600">
                  {{ formatNumber(m.previousStock) }} → <strong class="text-slate-900 font-bold">{{ formatNumber(m.newStock) }}</strong>
                </td>
                <td class="px-6 py-4 text-xs">
                  <div class="font-medium text-slate-800">{{ m.userName || 'Sistema' }}</div>
                  <div class="text-slate-500 truncate max-w-xs">{{ m.reason || 'Sem justificativa' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: Formal Purchase / Goods Receipt Form -->
    <div v-if="activeTab === 'purchase'" class="space-y-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs">
        <div class="border-b border-slate-100 pb-4 mb-6">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck class="h-5 w-5 text-emerald-600" />
            Entrada de Mercadoria / Compra com NF e Lote
          </h2>
          <p class="text-xs text-slate-500 mt-1">Dê entrada em novos produtos, atualize custos e registre os lotes com datas de validade</p>
        </div>

        <div v-if="purchaseErrorMessage" class="mb-6 flex items-start gap-2.5 rounded-xl bg-rose-50 p-4 text-xs text-rose-800 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ purchaseErrorMessage }}</span>
        </div>

        <form @submit.prevent="submitPurchase" class="space-y-6">
          <!-- Cabeçalho da Compra -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Fornecedor</label>
              <select
                v-model="purchaseForm.supplierId"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option :value="null">Selecione o Fornecedor (Opcional)</option>
                <option v-for="s in suppliersList" :key="s.id" :value="s.id">
                  {{ s.name }} (CNPJ: {{ s.cnpj || '—' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Número da Nota Fiscal / Pedido</label>
              <input
                v-model="purchaseForm.invoiceNumber"
                type="text"
                placeholder="Ex: NF-e 12345"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <input
                v-model="purchaseForm.notes"
                type="text"
                placeholder="Observações da entrega..."
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <!-- Itens da Entrada -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens da Entrada</h3>
              <button
                type="button"
                @click="addPurchaseItem"
                class="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <Plus class="h-3.5 w-3.5 text-emerald-600" />
                Adicionar Produto
              </button>
            </div>

            <div
              v-for="(item, idx) in purchaseForm.items"
              :key="idx"
              class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-600">Item #{{ idx + 1 }}</span>
                <button
                  type="button"
                  @click="removePurchaseItem(idx)"
                  :disabled="purchaseForm.items.length === 1"
                  class="text-xs text-rose-600 hover:text-rose-800 disabled:opacity-30 cursor-pointer"
                >
                  Remover
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-medium text-slate-600 mb-1">Produto *</label>
                  <select
                    v-model="item.productId"
                    @change="onProductSelectInPurchase(idx)"
                    required
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option :value="null" disabled>Selecione um produto</option>
                    <option v-for="p in productsList" :key="p.id" :value="p.id">
                      {{ p.name }} ({{ p.barcode }})
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Qtd *</label>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Custo Un (R$) *</label>
                  <input
                    v-model.number="item.costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Lote</label>
                  <input
                    v-model="item.batchNumber"
                    type="text"
                    placeholder="Ex: LT-2026-01"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Validade</label>
                  <input
                    v-model="item.expirationDate"
                    type="date"
                    class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Total e Envio -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div>
              <span class="text-xs text-slate-500 block">Total da Entrada:</span>
              <span class="text-2xl font-bold text-slate-900">{{ formatMoney(purchaseTotal) }}</span>
            </div>

            <button
              type="submit"
              :disabled="isSavingPurchase"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="isSavingPurchase" class="h-4 w-4 animate-spin" />
              <span>Confirmar e Atualizar Estoque</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Movement Modal -->
    <div
      v-if="isQuickModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 class="text-lg font-bold text-slate-900 mb-1">
          {{ quickActionType === 'ENTRY' ? 'Entrada Rápida de Estoque' : quickActionType === 'LOSS' ? 'Registrar Perda / Avaria' : 'Ajuste de Inventário' }}
        </h2>
        <p class="text-xs text-slate-500 mb-4">
          Produto: <strong class="text-slate-900 font-semibold">{{ quickProduct?.name }}</strong>
          (Estoque Atual: {{ formatNumber(quickProduct?.currentStock) }} {{ quickProduct?.unit }})
        </p>

        <div v-if="quickErrorMessage" class="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ quickErrorMessage }}</span>
        </div>

        <form @submit.prevent="submitQuickMovement" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              {{ quickActionType === 'ADJUSTMENT' ? 'Novo Saldo Total de Estoque *' : 'Quantidade *' }}
            </label>
            <input
              v-model.number="quickQuantity"
              type="number"
              step="0.001"
              min="0.001"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificativa *</label>
            <input
              v-model="quickReason"
              type="text"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ex: Contagem física, vencimento, quebra, reposição..."
            />
          </div>

          <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="isQuickModalOpen = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSavingQuick"
              :class="[
                'inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer',
                quickActionType === 'LOSS' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              ]"
            >
              <Loader2 v-if="isSavingQuick" class="h-4 w-4 animate-spin" />
              <span>Confirmar Movimentação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
