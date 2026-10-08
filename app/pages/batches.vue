<script setup lang="ts">
import {
  CalendarClock,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Package,
  Clock,
  ShieldAlert,
  Filter,
  Flame
} from 'lucide-vue-next'

definePageMeta({
  roles: ['ADMIN', 'MANAGER']
})

interface BatchItem {
  id: number
  productId: number
  productName: string
  productBarcode: string
  productSku: string
  productUnit: string
  batchNumber: string
  initialQuantity: string
  currentQuantity: string
  costPrice: string
  manufacturingDate: string | null
  expirationDate: string
  active: boolean
  createdAt: string
  daysToExpiration: number
  status: 'EXPIRED' | 'EXPIRING_7_DAYS' | 'EXPIRING_30_DAYS' | 'OK'
  statusLabel: string
  statusBadgeColor: string
}

interface BatchesResponse {
  batches: BatchItem[]
  summary: {
    total: number
    expired: number
    expiring7Days: number
    expiring30Days: number
    regular: number
  }
}

const searchQuery = ref('')
const selectedStatus = ref<string>('ALL')

const { data, refresh, pending } = await useFetch<BatchesResponse>('/api/batches', {
  query: computed(() => ({
    q: searchQuery.value || undefined,
    status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value
  }))
})

const batchesList = computed(() => data.value?.batches || [])
const summary = computed(() => data.value?.summary || { total: 0, expired: 0, expiring7Days: 0, expiring30Days: 0, regular: 0 })

// Fetch products for create batch modal
const { data: productsData } = await useFetch<{ products: any[] }>('/api/products', { query: { active: 'true' } })
const productsList = computed(() => productsData.value?.products || [])

// Modal state
const isModalOpen = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  productId: null as number | null,
  batchNumber: '',
  quantity: 10,
  costPrice: 0,
  manufacturingDate: '',
  expirationDate: '',
  active: true
})

// Discard modal state
const isDiscardModalOpen = ref(false)
const batchToDiscard = ref<BatchItem | null>(null)
const discardReason = ref('Produto vencido / impróprio para consumo')
const isDiscarding = ref(false)
const discardErrorMessage = ref('')

const openCreateModal = () => {
  errorMessage.value = ''
  form.value = {
    productId: productsList.value[0]?.id || null,
    batchNumber: 'LT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
    quantity: 20,
    costPrice: 0,
    manufacturingDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    active: true
  }
  isModalOpen.value = true
}

const saveBatch = async () => {
  isSaving.value = true
  errorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>('/api/batches', {
      method: 'POST',
      body: form.value
    })
    isModalOpen.value = false
    successMessage.value = res.message
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.data?.data?.errors?.expirationDate?.[0] || 'Erro ao cadastrar lote'
  } finally {
    isSaving.value = false
  }
}

const openDiscardModal = (batch: BatchItem) => {
  batchToDiscard.value = batch
  discardReason.value = batch.status === 'EXPIRED' ? 'Descarte de produto vencido' : 'Descarte por avaria / não conformidade'
  discardErrorMessage.value = ''
  isDiscardModalOpen.value = true
}

const executeDiscard = async () => {
  if (!batchToDiscard.value) return
  isDiscarding.value = true
  discardErrorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>(`/api/batches/${batchToDiscard.value.id}/discard`, {
      method: 'POST',
      body: { reason: discardReason.value }
    })
    isDiscardModalOpen.value = false
    successMessage.value = res.message
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (err: any) {
    discardErrorMessage.value = err.data?.message || 'Erro ao descartar lote'
  } finally {
    isDiscarding.value = false
  }
}

const formatNumber = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <CalendarClock class="h-7 w-7 text-emerald-600" />
          Controle de Lotes & Validade
        </h1>
        <p class="text-sm text-slate-500 mt-1">Prevenção de perdas, alertas de vencimento (7/30 dias) e controle sanitário</p>
      </div>

      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        Novo Lote
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

    <!-- Expiration Status Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Vencidos Card (Red) -->
      <button
        type="button"
        @click="selectedStatus = selectedStatus === 'EXPIRED' ? 'ALL' : 'EXPIRED'"
        :class="[
          'rounded-2xl border p-5 text-left transition cursor-pointer shadow-xs',
          selectedStatus === 'EXPIRED'
            ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20'
            : 'border-slate-200 bg-white hover:border-rose-200'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-rose-700 uppercase flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
            Vencidos
          </span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <Flame class="h-5 w-5" />
          </div>
        </div>
        <p class="text-3xl font-bold text-rose-700 mt-2">{{ summary.expired }}</p>
        <p class="text-xs text-rose-600 mt-1 font-medium">🔴 Retirar imediatamente de venda</p>
      </button>

      <!-- Vencendo em 7 dias (Orange) -->
      <button
        type="button"
        @click="selectedStatus = selectedStatus === 'EXPIRING_7_DAYS' ? 'ALL' : 'EXPIRING_7_DAYS'"
        :class="[
          'rounded-2xl border p-5 text-left transition cursor-pointer shadow-xs',
          selectedStatus === 'EXPIRING_7_DAYS'
            ? 'border-orange-500 bg-orange-50/80 ring-2 ring-orange-500/20'
            : 'border-slate-200 bg-white hover:border-orange-200'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-orange-700 uppercase">Vence em até 7 dias</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <AlertTriangle class="h-5 w-5" />
          </div>
        </div>
        <p class="text-3xl font-bold text-orange-700 mt-2">{{ summary.expiring7Days }}</p>
        <p class="text-xs text-orange-600 mt-1 font-medium">🟠 Vencimento próximo (Promoção/Ação)</p>
      </button>

      <!-- Vencendo em 30 dias (Yellow) -->
      <button
        type="button"
        @click="selectedStatus = selectedStatus === 'EXPIRING_30_DAYS' ? 'ALL' : 'EXPIRING_30_DAYS'"
        :class="[
          'rounded-2xl border p-5 text-left transition cursor-pointer shadow-xs',
          selectedStatus === 'EXPIRING_30_DAYS'
            ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20'
            : 'border-slate-200 bg-white hover:border-amber-200'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-amber-700 uppercase">Vence em até 30 dias</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Clock class="h-5 w-5" />
          </div>
        </div>
        <p class="text-3xl font-bold text-amber-700 mt-2">{{ summary.expiring30Days }}</p>
        <p class="text-xs text-amber-600 mt-1 font-medium">🟡 Atenção ao giro de estoque</p>
      </button>

      <!-- Validade Regular (Green) -->
      <button
        type="button"
        @click="selectedStatus = selectedStatus === 'OK' ? 'ALL' : 'OK'"
        :class="[
          'rounded-2xl border p-5 text-left transition cursor-pointer shadow-xs',
          selectedStatus === 'OK'
            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
            : 'border-slate-200 bg-white hover:border-emerald-200'
        ]"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-emerald-700 uppercase">Validade Regular</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 class="h-5 w-5" />
          </div>
        </div>
        <p class="text-3xl font-bold text-emerald-700 mt-2">{{ summary.regular }}</p>
        <p class="text-xs text-emerald-600 mt-1 font-medium">🟢 Prazo superior a 30 dias</p>
      </button>
    </div>

    <!-- Filter & Search Bar -->
    <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div class="relative w-full sm:w-96">
        <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por lote, produto ou código de barras..."
          class="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <span class="text-xs font-medium text-slate-500">Filtrar por:</span>
        <select
          v-model="selectedStatus"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
        >
          <option value="ALL">Todos os Lotes ({{ summary.total }})</option>
          <option value="EXPIRED">🔴 Vencidos ({{ summary.expired }})</option>
          <option value="EXPIRING_7_DAYS">🟠 Vencendo em 7 dias ({{ summary.expiring7Days }})</option>
          <option value="EXPIRING_30_DAYS">🟡 Vencendo em 30 dias ({{ summary.expiring30Days }})</option>
          <option value="OK">🟢 Validade Regular ({{ summary.regular }})</option>
        </select>
      </div>
    </div>

    <!-- Batches Table -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div v-if="pending" class="flex justify-center items-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
      </div>

      <div v-else-if="batchesList.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-4">
        <CalendarClock class="h-10 w-10 text-slate-300 mb-2" />
        <p class="font-semibold text-slate-800">Nenhum lote encontrado</p>
        <p class="text-xs text-slate-500 mt-1">Nenhum lote corresponde aos filtros selecionados.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3.5">Lote / Produto</th>
              <th class="px-6 py-3.5">Saldo / Inicial</th>
              <th class="px-6 py-3.5">Fabricação</th>
              <th class="px-6 py-3.5">Data de Validade</th>
              <th class="px-6 py-3.5">Status Sanitário</th>
              <th class="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="b in batchesList" :key="b.id" class="hover:bg-slate-50/80 transition">
              <td class="px-6 py-4">
                <span class="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                  {{ b.batchNumber }}
                </span>
                <div class="font-semibold text-slate-900 mt-1">{{ b.productName }}</div>
                <div class="font-mono text-[11px] text-slate-400">Barcode: {{ b.productBarcode }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 text-sm">
                  {{ formatNumber(b.currentQuantity) }} {{ b.productUnit }}
                </div>
                <div class="text-[11px] text-slate-400">
                  Inicial: {{ formatNumber(b.initialQuantity) }}
                </div>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-slate-600">
                {{ formatDate(b.manufacturingDate) }}
              </td>
              <td class="px-6 py-4 text-xs font-mono font-bold text-slate-900">
                {{ formatDate(b.expirationDate) }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                    b.statusBadgeColor
                  ]"
                >
                  <span
                    :class="[
                      'h-2 w-2 rounded-full',
                      b.status === 'EXPIRED' ? 'bg-rose-500' :
                      b.status === 'EXPIRING_7_DAYS' ? 'bg-orange-500' :
                      b.status === 'EXPIRING_30_DAYS' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    ]"
                  ></span>
                  {{ b.statusLabel }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- Discard expired batch button -->
                  <button
                    v-if="Number(b.currentQuantity) > 0"
                    @click="openDiscardModal(b)"
                    :class="[
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer',
                      b.status === 'EXPIRED'
                        ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-2xs'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    ]"
                    :title="b.status === 'EXPIRED' ? 'Descartar lote vencido imediatamente' : 'Registrar descarte de lote'"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                    <span>Descartar</span>
                  </button>

                  <span v-else class="text-xs text-slate-400 font-medium">Lote Esgotado</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Batch Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CalendarClock class="h-5 w-5 text-emerald-600" />
          Cadastrar Novo Lote de Produto
        </h2>

        <div v-if="errorMessage" class="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="saveBatch" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Produto *</label>
            <select
              v-model="form.productId"
              required
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option :value="null" disabled>Selecione um produto</option>
              <option v-for="p in productsList" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.barcode }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Número do Lote *</label>
              <input
                v-model="form.batchNumber"
                type="text"
                required
                placeholder="Ex: LT-2026-001"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 font-mono uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Quantidade *</label>
              <input
                v-model.number="form.quantity"
                type="number"
                step="0.001"
                min="0.001"
                required
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Data de Fabricação</label>
              <input
                v-model="form.manufacturingDate"
                type="date"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Data de Validade *</label>
              <input
                v-model="form.expirationDate"
                type="date"
                required
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="isModalOpen = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <span>Cadastrar Lote</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Discard Modal -->
    <div
      v-if="isDiscardModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div class="flex items-center gap-3 text-rose-600 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
            <Trash2 class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Descarte de Lote</h2>
            <p class="text-xs text-slate-500">Baixa sanitária por vencimento ou avaria</p>
          </div>
        </div>

        <p class="text-sm text-slate-600 mb-2">
          Confirma o descarte de <strong class="text-slate-900">{{ formatNumber(batchToDiscard?.currentQuantity) }} {{ batchToDiscard?.productUnit }}</strong> do produto <strong class="text-slate-900">"{{ batchToDiscard?.productName }}"</strong> (Lote {{ batchToDiscard?.batchNumber }})?
        </p>
        <p class="text-xs text-slate-500 mb-4">
          Esta ação zerará o saldo deste lote e registrará uma saída por <strong>PERDA (LOSS)</strong> no estoque com auditoria.
        </p>

        <div v-if="discardErrorMessage" class="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle class="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{{ discardErrorMessage }}</span>
        </div>

        <div class="space-y-3 mb-6">
          <label class="block text-xs font-semibold text-slate-700">Motivo do Descarte *</label>
          <input
            v-model="discardReason"
            type="text"
            required
            class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            placeholder="Ex: Produto com validade expirada..."
          />
        </div>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="isDiscardModalOpen = false"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="executeDiscard"
            :disabled="isDiscarding"
            class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition disabled:opacity-50 cursor-pointer"
          >
            <Loader2 v-if="isDiscarding" class="h-4 w-4 animate-spin" />
            <span>Confirmar Descarte</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
