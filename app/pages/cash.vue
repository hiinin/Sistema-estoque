<script setup lang="ts">
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  RefreshCw,
  QrCode,
  CreditCard,
  Banknote,
  History,
  FileSpreadsheet
} from 'lucide-vue-next'

const { user, hasRole } = useAuth()
const isManager = computed(() => hasRole(['ADMIN', 'MANAGER']))

// Estado de dados do caixa atual
const { data: currentCashData, refresh: refreshCurrent, pending: pendingCurrent } = await useFetch('/api/cash/current')
const { data: historyData, refresh: refreshHistory, pending: pendingHistory } = await useFetch('/api/cash', {
  query: { limit: 15 }
})

const isOpen = computed(() => currentCashData.value?.isOpen || false)
const activeRegister = computed(() => currentCashData.value?.register)
const summary = computed(() => currentCashData.value?.summary)
const pastRegisters = computed(() => historyData.value?.cashRegisters || [])

// Modais
const isOpeningModalOpen = ref(false)
const isMovementModalOpen = ref(false)
const movementType = ref<'BLEED' | 'REINFORCEMENT'>('BLEED')
const isClosingModalOpen = ref(false)

// Formulários
const openingForm = ref({
  amount: 0,
  notes: ''
})

const movementForm = ref({
  amount: 0,
  description: ''
})

const closingForm = ref({
  countedAmount: 0,
  notes: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Helpers de formatação
const formatCurrency = (val?: number | string) => {
  const num = Number(val) || 0
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 1. Abrir Caixa
const handleOpenRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const res: any = await $fetch('/api/cash/open', {
      method: 'POST',
      body: {
        openingAmount: openingForm.value.amount,
        notes: openingForm.value.notes
      }
    })
    successMessage.value = res.message || 'Caixa aberto com sucesso!'
    isOpeningModalOpen.value = false
    openingForm.value = { amount: 0, notes: '' }
    await Promise.all([refreshCurrent(), refreshHistory()])
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Erro ao abrir o caixa'
  } finally {
    isSubmitting.value = false
  }
}

// 2. Sangria / Suprimento
const openMovementModal = (type: 'BLEED' | 'REINFORCEMENT') => {
  movementType.value = type
  movementForm.value = { amount: 0, description: '' }
  errorMessage.value = ''
  isMovementModalOpen.value = true
}

const handleMovement = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const res: any = await $fetch('/api/cash/movement', {
      method: 'POST',
      body: {
        type: movementType.value,
        amount: movementForm.value.amount,
        description: movementForm.value.description
      }
    })
    successMessage.value = res.message || 'Movimentação realizada!'
    isMovementModalOpen.value = false
    movementForm.value = { amount: 0, description: '' }
    await refreshCurrent()
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Erro ao registrar movimentação'
  } finally {
    isSubmitting.value = false
  }
}

// 3. Fechamento de Caixa
const openClosingModal = () => {
  closingForm.value = {
    countedAmount: summary.value?.currentPhysicalCash || 0,
    notes: ''
  }
  errorMessage.value = ''
  isClosingModalOpen.value = true
}

const expectedDifference = computed(() => {
  const expected = summary.value?.currentPhysicalCash || 0
  const counted = Number(closingForm.value.countedAmount) || 0
  return counted - expected
})

const handleCloseRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const res: any = await $fetch('/api/cash/close', {
      method: 'POST',
      body: {
        closingAmount: closingForm.value.countedAmount,
        notes: closingForm.value.notes
      }
    })
    successMessage.value = res.message || 'Caixa fechado com sucesso!'
    isClosingModalOpen.value = false
    await Promise.all([refreshCurrent(), refreshHistory()])
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Erro ao fechar caixa'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header com Título e Ações Rápidas -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Wallet class="h-7 w-7 text-emerald-600" />
          <span>Controle de Caixa & Turnos</span>
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Gerencie abertura, sangrias, suprimentos e fechamento com conferência cega e auditoria total.
        </p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <button
          @click="refreshCurrent(); refreshHistory()"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw :class="['h-3.5 w-3.5', pendingCurrent ? 'animate-spin' : '']" />
          <span>Atualizar</span>
        </button>

        <template v-if="!isOpen">
          <button
            @click="isOpeningModalOpen = true"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Unlock class="h-4 w-4" />
            <span>Abrir Caixa</span>
          </button>
        </template>

        <template v-else>
          <button
            @click="openMovementModal('REINFORCEMENT')"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Suprimento (Troco)</span>
          </button>

          <button
            @click="openMovementModal('BLEED')"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition cursor-pointer"
          >
            <Minus class="h-3.5 w-3.5" />
            <span>Sangria (Retirada)</span>
          </button>

          <button
            @click="openClosingModal"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Lock class="h-4 w-4" />
            <span>Fechar Caixa</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Alertas Globais -->
    <div
      v-if="successMessage"
      class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm animate-fade-in"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <span>{{ successMessage }}</span>
      </div>
      <button @click="successMessage = ''" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold">×</button>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-sm animate-fade-in"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-5 w-5 text-rose-600 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
      <button @click="errorMessage = ''" class="text-rose-600 hover:text-rose-800 text-xs font-bold">×</button>
    </div>

    <!-- Banner de Status do Caixa -->
    <div
      :class="[
        'rounded-2xl p-6 border transition-all shadow-xs',
        isOpen
          ? 'bg-linear-to-r from-emerald-950 via-slate-900 to-slate-900 border-emerald-500/30 text-white'
          : 'bg-white border-slate-200 text-slate-800'
      ]"
    >
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-start gap-4">
          <div
            :class="[
              'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md',
              isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-500'
            ]"
          >
            <component :is="isOpen ? Unlock : Lock" class="h-6 w-6" />
          </div>

          <div>
            <div class="flex items-center gap-2.5 flex-wrap">
              <span
                :class="[
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                  isOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 text-slate-600'
                ]"
              >
                <span :class="['h-2 w-2 rounded-full', isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400']"></span>
                {{ isOpen ? 'Caixa Aberto em Operação' : 'Caixa Fechado' }}
              </span>

              <span v-if="isOpen" class="text-xs text-slate-400">
                Sessão #{{ activeRegister?.id }}
              </span>
            </div>

            <h2 class="text-xl font-bold mt-1" :class="isOpen ? 'text-white' : 'text-slate-900'">
              {{ isOpen ? 'Turno Ativo no Ponto de Venda' : 'Nenhuma sessão de caixa aberta no momento' }}
            </h2>

            <p class="text-xs mt-1" :class="isOpen ? 'text-slate-300' : 'text-slate-500'">
              <template v-if="isOpen">
                Aberto por <strong class="text-white">{{ activeRegister?.user?.name }}</strong> em
                {{ formatDateTime(activeRegister?.openedAt) }}
              </template>
              <template v-else>
                Abra uma nova sessão de caixa informando o fundo de troco para iniciar as vendas no PDV.
              </template>
            </p>
          </div>
        </div>

        <div v-if="isOpen" class="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
          <div>
            <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Dinheiro em Gaveta</span>
            <div class="text-2xl font-black text-emerald-400">
              {{ formatCurrency(summary?.currentPhysicalCash) }}
            </div>
          </div>
          <div class="h-8 w-px bg-slate-700 hidden sm:block"></div>
          <div>
            <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fundo Inicial</span>
            <div class="text-base font-bold text-slate-200">
              {{ formatCurrency(summary?.openingAmount) }}
            </div>
          </div>
        </div>

        <div v-else>
          <button
            @click="isOpeningModalOpen = true"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition cursor-pointer"
          >
            Abrir Caixa Agora
          </button>
        </div>
      </div>
    </div>

    <!-- Cards de Resumo Financeiro da Sessão Ativa -->
    <template v-if="isOpen">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Vendas em Dinheiro -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Vendas Dinheiro</span>
            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Banknote class="h-4 w-4" />
            </div>
          </div>
          <div class="text-xl font-bold text-slate-900 mt-2">
            {{ formatCurrency(summary?.totalCashSales) }}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">Soma física na gaveta</p>
        </div>

        <!-- Vendas PIX -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Vendas PIX</span>
            <div class="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <QrCode class="h-4 w-4" />
            </div>
          </div>
          <div class="text-xl font-bold text-slate-900 mt-2">
            {{ formatCurrency(summary?.totalPixSales) }}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">Crédito em conta corrente</p>
        </div>

        <!-- Vendas Cartão -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Cartões Débito/Crédito</span>
            <div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard class="h-4 w-4" />
            </div>
          </div>
          <div class="text-xl font-bold text-slate-900 mt-2">
            {{ formatCurrency((summary?.totalDebitSales || 0) + (summary?.totalCreditSales || 0)) }}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">
            D: {{ formatCurrency(summary?.totalDebitSales) }} | C: {{ formatCurrency(summary?.totalCreditSales) }}
          </p>
        </div>

        <!-- Suprimentos e Sangrias -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Sangrias & Suprimentos</span>
            <div class="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <History class="h-4 w-4" />
            </div>
          </div>
          <div class="text-xl font-bold text-slate-900 mt-2">
            {{ formatCurrency((summary?.totalReinforcements || 0) - (summary?.totalBleeds || 0)) }}
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">
            +{{ formatCurrency(summary?.totalReinforcements) }} | -{{ formatCurrency(summary?.totalBleeds) }}
          </p>
        </div>
      </div>

      <!-- Tabela de Movimentações da Sessão Atual -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Lançamentos da Sessão Atual</h3>
            <p class="text-xs text-slate-500">Entradas, vendas, retiradas e reforços em tempo real.</p>
          </div>
          <span class="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
            {{ activeRegister?.movements?.length || 0 }} lançamentos
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th class="px-5 py-3">Horário</th>
                <th class="px-5 py-3">Tipo</th>
                <th class="px-5 py-3">Forma / Origem</th>
                <th class="px-5 py-3">Descrição</th>
                <th class="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!activeRegister?.movements?.length">
                <td colspan="5" class="px-5 py-8 text-center text-slate-400">
                  Nenhuma movimentação registrada nesta sessão ainda.
                </td>
              </tr>
              <tr
                v-for="mov in activeRegister?.movements"
                :key="mov.id"
                class="hover:bg-slate-50/60 transition"
              >
                <td class="px-5 py-3 text-slate-600 whitespace-nowrap">
                  {{ formatDateTime(mov.createdAt) }}
                </td>
                <td class="px-5 py-3 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[10px]',
                      mov.type === 'SALE' ? 'bg-emerald-50 text-emerald-700' :
                      mov.type === 'REINFORCEMENT' ? 'bg-blue-50 text-blue-700' :
                      mov.type === 'BLEED' ? 'bg-rose-50 text-rose-700' :
                      mov.type === 'OPENING' ? 'bg-purple-50 text-purple-700' :
                      'bg-slate-100 text-slate-700'
                    ]"
                  >
                    <component
                      :is="mov.type === 'BLEED' ? Minus : Plus"
                      class="h-2.5 w-2.5"
                    />
                    {{
                      mov.type === 'SALE' ? 'Venda PDV' :
                      mov.type === 'REINFORCEMENT' ? 'Suprimento' :
                      mov.type === 'BLEED' ? 'Sangria' :
                      mov.type === 'OPENING' ? 'Abertura' : 'Fechamento'
                    }}
                  </span>
                </td>
                <td class="px-5 py-3 text-slate-600 font-medium">
                  {{ mov.paymentMethod || 'Dinheiro' }}
                </td>
                <td class="px-5 py-3 text-slate-600 max-w-xs truncate">
                  {{ mov.description || '-' }}
                </td>
                <td
                  :class="[
                    'px-5 py-3 text-right font-bold whitespace-nowrap',
                    mov.type === 'BLEED' ? 'text-rose-600' : 'text-emerald-700'
                  ]"
                >
                  {{ mov.type === 'BLEED' ? '-' : '+' }} {{ formatCurrency(mov.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Histórico de Caixas Fechados -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-slate-900 text-base">Histórico de Sessões de Caixa</h3>
          <p class="text-xs text-slate-500">Auditoria completa dos turnos passados com conferência e quebra/sobra.</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th class="px-5 py-3">Sessão #</th>
              <th class="px-5 py-3">Operador</th>
              <th class="px-5 py-3">Abertura / Fechamento</th>
              <th class="px-5 py-3 text-right">Fundo Inicial</th>
              <th class="px-5 py-3 text-right">Esperado</th>
              <th class="px-5 py-3 text-right">Apurado</th>
              <th class="px-5 py-3 text-right">Diferença (Quebra/Sobra)</th>
              <th class="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!pastRegisters.length">
              <td colspan="8" class="px-5 py-8 text-center text-slate-400">
                Nenhuma sessão de caixa arquivada no histórico.
              </td>
            </tr>
            <tr
              v-for="reg in pastRegisters"
              :key="reg.id"
              class="hover:bg-slate-50/60 transition"
            >
              <td class="px-5 py-3.5 font-bold text-slate-900">
                #{{ reg.id }}
              </td>
              <td class="px-5 py-3.5 text-slate-700">
                <div class="font-medium">{{ reg.user?.name }}</div>
                <div class="text-[10px] text-slate-400">{{ reg.user?.email }}</div>
              </td>
              <td class="px-5 py-3.5 text-slate-600">
                <div>Ab: {{ formatDateTime(reg.openedAt) }}</div>
                <div class="text-[10px] text-slate-400">Fe: {{ formatDateTime(reg.closedAt) }}</div>
              </td>
              <td class="px-5 py-3.5 text-right font-medium text-slate-700">
                {{ formatCurrency(reg.openingAmount) }}
              </td>
              <td class="px-5 py-3.5 text-right font-medium text-slate-700">
                {{ formatCurrency(reg.expectedAmount) }}
              </td>
              <td class="px-5 py-3.5 text-right font-bold text-slate-900">
                {{ formatCurrency(reg.closingAmount) }}
              </td>
              <td class="px-5 py-3.5 text-right whitespace-nowrap">
                <template v-if="reg.status === 'CLOSED'">
                  <span
                    :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px]',
                      Number(reg.differenceAmount) === 0 ? 'bg-slate-100 text-slate-700' :
                      Number(reg.differenceAmount) > 0 ? 'bg-emerald-50 text-emerald-700' :
                      'bg-rose-50 text-rose-700'
                    ]"
                  >
                    {{ Number(reg.differenceAmount) > 0 ? '+' : '' }}{{ formatCurrency(reg.differenceAmount) }}
                    {{
                      Number(reg.differenceAmount) === 0 ? ' (Exato)' :
                      Number(reg.differenceAmount) > 0 ? ' (Sobra)' : ' (Quebra)'
                    }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-slate-400 italic">Em andamento</span>
                </template>
              </td>
              <td class="px-5 py-3.5 text-center">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
                    reg.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  ]"
                >
                  {{ reg.status === 'OPEN' ? 'Aberto' : 'Fechado' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL 1: ABERTURA DE CAIXA -->
    <div
      v-if="isOpeningModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-up">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Unlock class="h-5 w-5" />
            </div>
            <h3 class="font-bold text-slate-900 text-lg">Abertura de Caixa</h3>
          </div>
          <button @click="isOpeningModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <form @submit.prevent="handleOpenRegister" class="mt-4 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Fundo de Caixa / Troco Inicial (R$) *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">R$</span>
              <input
                v-model.number="openingForm.amount"
                type="number"
                step="0.01"
                min="0"
                required
                autofocus
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-base"
                placeholder="0.00"
              />
            </div>
            <p class="text-[11px] text-slate-400 mt-1">
              Informe a quantidade em cédulas e moedas disponível para troco inicial.
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Observações (opcional)</label>
            <textarea
              v-model="openingForm.notes"
              rows="2"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              placeholder="Ex: Turno da manhã, notas trocadas..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="isOpeningModalOpen = false"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>Confirmar Abertura</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 2: SANGRIA / SUPRIMENTO -->
    <div
      v-if="isMovementModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-scale-up">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div
              :class="[
                'p-2 rounded-xl',
                movementType === 'BLEED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              ]"
            >
              <component :is="movementType === 'BLEED' ? Minus : Plus" class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-lg">
                {{ movementType === 'BLEED' ? 'Lançar Sangria (Retirada)' : 'Lançar Suprimento (Reforço)' }}
              </h3>
              <p class="text-xs text-slate-500">
                {{ movementType === 'BLEED' ? 'Retirada de valor para cofre ou depósito' : 'Entrada de valor adicional para troco' }}
              </p>
            </div>
          </div>
          <button @click="isMovementModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <form @submit.prevent="handleMovement" class="mt-4 space-y-4">
          <div v-if="movementType === 'BLEED'" class="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex justify-between">
            <span>Saldo em Dinheiro na Gaveta:</span>
            <strong class="text-slate-900">{{ formatCurrency(summary?.currentPhysicalCash) }}</strong>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Valor (R$) *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">R$</span>
              <input
                v-model.number="movementForm.amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                autofocus
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-base"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificativa *</label>
            <input
              v-model="movementForm.description"
              type="text"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
              :placeholder="movementType === 'BLEED' ? 'Ex: Recolhimento para cofre / pagamento de despesa' : 'Ex: Adição de moedas e cédulas pequenas'"
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="isMovementModalOpen = false"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              :class="[
                'px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50',
                movementType === 'BLEED' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              ]"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>Confirmar {{ movementType === 'BLEED' ? 'Sangria' : 'Suprimento' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL 3: FECHAMENTO DE CAIXA COM CONFERÊNCIA -->
    <div
      v-if="isClosingModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scale-up">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <Lock class="h-5 w-5" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-lg">Fechamento & Conferência de Caixa</h3>
              <p class="text-xs text-slate-500">Sessão #{{ activeRegister?.id }} — {{ activeRegister?.user?.name }}</p>
            </div>
          </div>
          <button @click="isClosingModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <!-- Resumo da Sessão -->
        <div class="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div class="flex justify-between text-slate-600">
            <span>Fundo Inicial:</span>
            <span class="font-semibold text-slate-800">{{ formatCurrency(summary?.openingAmount) }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Vendas em Dinheiro:</span>
            <span class="font-semibold text-emerald-700">+{{ formatCurrency(summary?.totalCashSales) }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Suprimentos Adicionados:</span>
            <span class="font-semibold text-blue-700">+{{ formatCurrency(summary?.totalReinforcements) }}</span>
          </div>
          <div class="flex justify-between text-slate-600">
            <span>Sangrias Realizadas:</span>
            <span class="font-semibold text-amber-700">-{{ formatCurrency(summary?.totalBleeds) }}</span>
          </div>
          <div class="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
            <span>Dinheiro Esperado na Gaveta:</span>
            <span class="text-emerald-700">{{ formatCurrency(summary?.currentPhysicalCash) }}</span>
          </div>
        </div>

        <form @submit.prevent="handleCloseRegister" class="mt-4 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Valor Físico Apurado na Gaveta (R$) *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">R$</span>
              <input
                v-model.number="closingForm.countedAmount"
                type="number"
                step="0.01"
                min="0"
                required
                autofocus
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-base"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Indicador de Diferença (Quebra/Sobra) -->
          <div
            :class="[
              'p-3 rounded-xl border flex items-center justify-between text-xs',
              expectedDifference === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              expectedDifference > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' :
              'bg-rose-50 border-rose-200 text-rose-800'
            ]"
          >
            <div class="flex items-center gap-2">
              <component
                :is="expectedDifference === 0 ? CheckCircle2 : AlertTriangle"
                class="h-4 w-4 shrink-0"
              />
              <span class="font-medium">
                {{
                  expectedDifference === 0 ? 'Conferência exata! Caixa bateu 100%.' :
                  expectedDifference > 0 ? 'Sobra de caixa identificada:' :
                  'Quebra de caixa identificada:'
                }}
              </span>
            </div>
            <strong class="font-bold text-sm">
              {{ expectedDifference > 0 ? '+' : '' }}{{ formatCurrency(expectedDifference) }}
            </strong>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Observações de Encerramento</label>
            <textarea
              v-model="closingForm.notes"
              rows="2"
              class="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs"
              placeholder="Ex: Turno encerrado sem intercorrências..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="isClosingModalOpen = false"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <span>Confirmar Fechamento do Caixa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
