<script setup lang="ts">
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard,
  Banknote,
  QrCode,
  RotateCcw,
  Printer,
  User,
  Package,
  Receipt,
  Sparkles,
  Zap,
  ArrowRight,
  Wallet,
  AlertTriangle
} from 'lucide-vue-next'

const { user } = useAuth()

interface CartItem {
  productId: number
  name: string
  barcode: string
  sku: string
  unitPrice: number
  costPrice: number
  quantity: number
  maxStock: number
  unit: string
}

const barcodeInput = ref('')
const barcodeInputRef = ref<HTMLInputElement | null>(null)
const cart = ref<CartItem[]>([])
const selectedCustomerId = ref<number | null>(null)
const discountValue = ref<number>(0)
const paymentMethod = ref<'MONEY' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'>('PIX')
const cashReceived = ref<number>(0)
const notes = ref('')

const isSearching = ref(false)
const isSubmitting = ref(false)
const posErrorMessage = ref('')
const posSuccessMessage = ref('')

// Modal state for completed sale receipt
const isReceiptModalOpen = ref(false)
const completedSale = ref<any>(null)

// Modal for manual product search (catalog selector)
const isCatalogModalOpen = ref(false)
const catalogSearch = ref('')

// Fetch customers and products for lookup
const { data: customersData } = await useFetch<{ customers: any[] }>('/api/customers')
const customersList = computed(() => customersData.value?.customers || [])

const { data: productsData } = await useFetch<{ products: any[] }>('/api/products', { query: { active: 'true' } })
const allProducts = computed(() => productsData.value?.products || [])

// Fetch status do Caixa atual
const { data: currentCashData, refresh: refreshCash } = await useFetch<any>('/api/cash/current')
const isCashOpen = computed(() => currentCashData.value?.isOpen || false)
const cashDrawerTotal = computed(() => currentCashData.value?.summary?.currentPhysicalCash || 0)
const activeCashRegister = computed(() => currentCashData.value?.register)

const filteredCatalogProducts = computed(() => {
  if (!catalogSearch.value) return allProducts.value.slice(0, 15)
  const q = catalogSearch.value.toLowerCase()
  return allProducts.value.filter(
    p => p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q)
  )
})

// Auto-focus barcode input on mount and on clicks outside
onMounted(() => {
  focusBarcodeInput()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

const focusBarcodeInput = () => {
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

// Global POS Keyboard Shortcuts (F2: focus barcode, F4: clear cart, F9: submit sale)
const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'F2') {
    e.preventDefault()
    focusBarcodeInput()
  } else if (e.key === 'F4') {
    e.preventDefault()
    clearCart()
  } else if (e.key === 'F9') {
    e.preventDefault()
    if (canSubmit.value && !isSubmitting.value) {
      finalizeSale()
    }
  }
}

// Beep audio feedback function
const playSound = (type: 'success' | 'error') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime) // A3 (low buzz)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch {}
}

// 1. Barcode Scanner USB Input handler (Triggered on ENTER from scanner or keyboard)
const handleBarcodeScan = async () => {
  const code = barcodeInput.value.trim()
  if (!code) return

  isSearching.value = true
  posErrorMessage.value = ''

  try {
    // Busca produto pelo barcode ou SKU exato
    const found = allProducts.value.find(
      p => p.barcode === code || p.sku.toUpperCase() === code.toUpperCase()
    )

    if (!found) {
      // Tenta consultar a API caso tenha sido cadastrado recentemente
      const res = await $fetch<{ products: any[] }>(`/api/products?barcode=${encodeURIComponent(code)}`)
      if (res.products && res.products.length > 0) {
        addProductToCart(res.products[0])
        playSound('success')
      } else {
        playSound('error')
        posErrorMessage.value = `Produto com código "${code}" não encontrado no sistema.`
      }
    } else {
      addProductToCart(found)
      playSound('success')
    }
  } catch (err: any) {
    playSound('error')
    posErrorMessage.value = err.data?.message || 'Erro ao consultar código de barras'
  } finally {
    isSearching.value = false
    barcodeInput.value = ''
    focusBarcodeInput()
  }
}

// 2. Add product to cart (or increment quantity if already exists)
const addProductToCart = (product: any) => {
  posErrorMessage.value = ''
  const availableStock = Number(product.currentStock)

  if (availableStock <= 0) {
    playSound('error')
    posErrorMessage.value = `O produto "${product.name}" está com estoque esgotado (0 ${product.unit}).`
    return
  }

  const existingIndex = cart.value.findIndex(item => item.productId === product.id)

  if (existingIndex >= 0) {
    const existing = cart.value[existingIndex]
    if (existing.quantity + 1 > availableStock) {
      playSound('error')
      posErrorMessage.value = `Limite de estoque atingido para "${product.name}". Disponível: ${availableStock} ${product.unit}.`
      return
    }
    existing.quantity += 1
  } else {
    cart.value.push({
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku,
      unitPrice: Number(product.salePrice),
      costPrice: Number(product.costPrice),
      quantity: 1,
      maxStock: availableStock,
      unit: product.unit
    })
  }
}

const updateQuantity = (index: number, delta: number) => {
  const item = cart.value[index]
  if (!item) return
  const newQty = item.quantity + delta
  if (newQty <= 0) {
    removeFromCart(index)
    return
  }
  if (newQty > item.maxStock) {
    posErrorMessage.value = `Estoque máximo atingido para "${item.name}" (${item.maxStock} ${item.unit}).`
    return
  }
  item.quantity = newQty
  posErrorMessage.value = ''
}

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1)
  focusBarcodeInput()
}

const clearCart = () => {
  if (cart.value.length === 0) return
  if (confirm('Deseja realmente cancelar e limpar a venda atual?')) {
    cart.value = []
    discountValue.value = 0
    cashReceived.value = 0
    posErrorMessage.value = ''
    focusBarcodeInput()
  }
}

// Computed Totals
const subtotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
})

const total = computed(() => {
  return Math.max(0, subtotal.value - (Number(discountValue.value) || 0))
})

const changeDue = computed(() => {
  if (paymentMethod.value !== 'MONEY') return 0
  const received = Number(cashReceived.value) || 0
  return Math.max(0, received - total.value)
})

const canSubmit = computed(() => {
  if (cart.value.length === 0) return false
  if (paymentMethod.value === 'MONEY' && (Number(cashReceived.value) || 0) < total.value) {
    return false
  }
  return true
})

// 3. Finalize Sale (Checkout)
const finalizeSale = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  posErrorMessage.value = ''

  try {
    const payload = {
      customerId: selectedCustomerId.value,
      discount: Number(discountValue.value) || 0,
      paymentMethod: paymentMethod.value,
      notes: notes.value || undefined,
      items: cart.value.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    }

    const res = await $fetch<{ message: string; sale: any }>('/api/sales', {
      method: 'POST',
      body: payload
    })

    // Fetch full receipt details
    const receiptData = await $fetch<{ sale: any }>(`/api/sales/${res.sale.id}`)
    completedSale.value = receiptData.sale
    isReceiptModalOpen.value = true
    playSound('success')

    // Reset Cart
    cart.value = []
    discountValue.value = 0
    cashReceived.value = 0
    notes.value = ''
    selectedCustomerId.value = null
    await refreshCash()
  } catch (err: any) {
    playSound('error')
    posErrorMessage.value = err.data?.message || 'Erro ao finalizar venda no PDV'
  } finally {
    isSubmitting.value = false
  }
}

const startNewSale = () => {
  isReceiptModalOpen.value = false
  completedSale.value = null
  focusBarcodeInput()
}

const printReceipt = () => {
  window.print()
}

const formatMoney = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatNumber = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Top Bar Quick Status -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-sm">
          <ShoppingCart class="h-5 w-5" />
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900 leading-tight">Frente de Caixa / PDV</h1>
          <p class="text-xs text-slate-500">Operador: <strong class="text-slate-800">{{ user?.name }}</strong> · Terminal Ativo</p>
        </div>
      </div>

      <!-- Cash Status and Shortcut chips -->
      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- Cash Status Pill -->
        <NuxtLink
          to="/cash"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer',
            isCashOpen
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
          ]"
          :title="isCashOpen ? 'Clique para gerenciar sangrias e fechamento' : 'Clique para abrir o caixa'"
        >
          <span
            :class="[
              'h-2 w-2 rounded-full',
              isCashOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            ]"
          ></span>
          <Wallet class="h-3.5 w-3.5" />
          <span v-if="isCashOpen">
            Caixa #{{ activeCashRegister?.id }} · Gaveta: {{ formatMoney(cashDrawerTotal) }}
          </span>
          <span v-else>
            Caixa Fechado (Abrir)
          </span>
        </NuxtLink>

        <!-- Quick Shortcut chips -->
        <div class="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500">
          <span class="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 font-mono">F2 Leitor</span>
          <span class="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 font-mono">F4 Cancelar</span>
          <span class="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 font-mono font-bold">F9 Finalizar</span>
        </div>
      </div>
    </div>

    <!-- Error / Notification banner -->
    <div
      v-if="posErrorMessage"
      class="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 animate-in fade-in"
    >
      <AlertCircle class="h-5 w-5 text-rose-600 shrink-0" />
      <span class="font-medium">{{ posErrorMessage }}</span>
    </div>

    <!-- Main POS Grid: Left is Scanner & Cart, Right is Payment & Totals -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <!-- LEFT SECTION: Scanner Input & Cart Table (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        <!-- BARCODE SCANNER INPUT BOX (High prominence) -->
        <div class="rounded-2xl border-2 border-emerald-500/40 bg-slate-900 p-4 text-white shadow-md">
          <label class="block text-xs font-semibold text-emerald-400 mb-1.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <Barcode class="h-4 w-4" />
              Passe o produto no Leitor USB ou Digite o Código de Barras (F2)
            </span>
            <span class="text-[10px] text-slate-400">Pressione ENTER para adicionar</span>
          </label>

          <form @submit.prevent="handleBarcodeScan" class="flex gap-2">
            <div class="relative flex-1">
              <Barcode class="absolute left-3.5 top-3.5 h-5 w-5 text-emerald-400" />
              <input
                ref="barcodeInputRef"
                v-model="barcodeInput"
                type="text"
                autocomplete="off"
                placeholder="Ex: 7894900011517 (Aproxime o leitor de código de barras)..."
                class="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-base text-white font-mono tracking-wider focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              :disabled="isSearching"
              class="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
            >
              <Loader2 v-if="isSearching" class="h-5 w-5 animate-spin" />
              <span v-else>Inserir</span>
            </button>

            <button
              type="button"
              @click="isCatalogModalOpen = true"
              title="Buscar no catálogo por nome"
              class="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Search class="h-4 w-4" />
              <span class="hidden sm:inline">Catálogo</span>
            </button>
          </form>
        </div>

        <!-- CART ITEMS TABLE -->
        <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col min-h-[420px]">
          <!-- Cart Header -->
          <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens no Carrinho</span>
              <span class="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold font-mono">
                {{ cart.length }}
              </span>
            </div>

            <button
              v-if="cart.length > 0"
              @click="clearCart"
              class="text-xs font-semibold text-rose-600 hover:text-rose-800 transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Limpar Venda (F4)
            </button>
          </div>

          <!-- Empty Cart State -->
          <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <Barcode class="h-8 w-8" />
            </div>
            <p class="font-bold text-slate-800 text-base">O carrinho está vazio</p>
            <p class="text-xs text-slate-500 mt-1 max-w-xs">Passe o produto no leitor de código de barras USB ou utilize a busca no catálogo.</p>
          </div>

          <!-- Cart Items List -->
          <div v-else class="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[450px]">
            <div
              v-for="(item, idx) in cart"
              :key="item.productId"
              class="flex items-center justify-between p-4 hover:bg-slate-50/70 transition gap-3"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-900 text-sm truncate">{{ item.name }}</span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 font-mono text-xs text-slate-400">
                  <span>{{ item.barcode }}</span>
                  <span>·</span>
                  <span>{{ formatMoney(item.unitPrice) }} / {{ item.unit }}</span>
                </div>
              </div>

              <!-- Quantity Controls -->
              <div class="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  @click="updateQuantity(idx, -1)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition shadow-2xs cursor-pointer"
                >
                  <Minus class="h-3.5 w-3.5" />
                </button>
                <span class="w-8 text-center font-bold font-mono text-sm text-slate-900">
                  {{ item.quantity }}
                </span>
                <button
                  type="button"
                  @click="updateQuantity(idx, 1)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition shadow-2xs cursor-pointer"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- Item Total & Delete -->
              <div class="text-right shrink-0 min-w-[80px]">
                <div class="font-bold text-slate-900 text-sm">
                  {{ formatMoney(item.quantity * item.unitPrice) }}
                </div>
                <button
                  type="button"
                  @click="removeFromCart(idx)"
                  class="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer mt-0.5"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT SECTION: Totals & Payment Checkout Panel (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <!-- Customer Selection (Optional) -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User class="h-3.5 w-3.5 text-slate-500" />
              Identificação do Cliente (Opcional)
            </label>
            <select
              v-model="selectedCustomerId"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option :value="null">Consumidor Final (Não Identificado)</option>
              <option v-for="c in customersList" :key="c.id" :value="c.id">
                {{ c.name }} (CPF: {{ c.cpf || '—' }})
              </option>
            </select>
          </div>

          <!-- Payment Method Tabs -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-2">Forma de Pagamento *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="paymentMethod = 'PIX'"
                :class="[
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer',
                  paymentMethod === 'PIX'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                ]"
              >
                <QrCode class="h-4 w-4 text-emerald-600" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                @click="paymentMethod = 'MONEY'"
                :class="[
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer',
                  paymentMethod === 'MONEY'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                ]"
              >
                <Banknote class="h-4 w-4 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                @click="paymentMethod = 'DEBIT_CARD'"
                :class="[
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer',
                  paymentMethod === 'DEBIT_CARD'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                ]"
              >
                <CreditCard class="h-4 w-4 text-emerald-600" />
                <span>Cartão Débito</span>
              </button>

              <button
                type="button"
                @click="paymentMethod = 'CREDIT_CARD'"
                :class="[
                  'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition cursor-pointer',
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-2xs'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                ]"
              >
                <CreditCard class="h-4 w-4 text-emerald-600" />
                <span>Cartão Crédito</span>
              </button>
            </div>
          </div>

          <!-- Cash Received and Change Calculation (If Dinheiro) -->
          <div v-if="paymentMethod === 'MONEY'" class="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2 animate-in fade-in">
            <div class="flex items-center justify-between gap-2">
              <label class="text-xs font-semibold text-amber-900">Valor Recebido (R$):</label>
              <input
                v-model.number="cashReceived"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                class="w-32 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-sm text-right font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div class="flex items-center justify-between text-xs pt-1 border-t border-amber-200">
              <span class="font-semibold text-amber-900">Troco a Devolver:</span>
              <span class="font-bold text-sm text-emerald-700 font-mono">{{ formatMoney(changeDue) }}</span>
            </div>
          </div>

          <!-- Discount Input -->
          <div class="flex items-center justify-between gap-3 pt-2">
            <label class="text-xs font-semibold text-slate-600">Desconto (R$):</label>
            <input
              v-model.number="discountValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              class="w-28 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-right font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <!-- Totals Summary Card -->
          <div class="rounded-xl bg-slate-900 p-5 text-white space-y-2">
            <div class="flex justify-between text-xs text-slate-400">
              <span>Subtotal:</span>
              <span class="font-mono">{{ formatMoney(subtotal) }}</span>
            </div>
            <div v-if="discountValue > 0" class="flex justify-between text-xs text-amber-400">
              <span>Desconto:</span>
              <span class="font-mono">- {{ formatMoney(discountValue) }}</span>
            </div>
            <div class="flex items-baseline justify-between pt-2 border-t border-slate-800">
              <span class="text-sm font-bold uppercase tracking-wider text-emerald-400">Total a Pagar</span>
              <span class="text-3xl font-extrabold font-mono text-white tracking-tight">
                {{ formatMoney(total) }}
              </span>
            </div>
          </div>

          <!-- Finalize Button -->
          <button
            type="button"
            @click="finalizeSale"
            :disabled="!canSubmit || isSubmitting"
            class="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2 v-if="isSubmitting" class="h-5 w-5 animate-spin" />
            <span v-else>Finalizar Venda (F9)</span>
            <ArrowRight v-if="!isSubmitting" class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Catalog Lookup Modal -->
    <div
      v-if="isCatalogModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <Search class="h-4 w-4 text-emerald-600" />
            Buscar Produto no Catálogo
          </h2>
          <button @click="isCatalogModalOpen = false" class="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
            Fechar
          </button>
        </div>

        <div class="relative mb-4">
          <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            v-model="catalogSearch"
            type="text"
            placeholder="Digite o nome, código de barras ou SKU..."
            class="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div class="flex-1 overflow-y-auto divide-y divide-slate-100">
          <div
            v-for="p in filteredCatalogProducts"
            :key="p.id"
            @click="addProductToCart(p); isCatalogModalOpen = false"
            class="flex items-center justify-between p-3 hover:bg-emerald-50/50 rounded-xl transition cursor-pointer"
          >
            <div>
              <p class="font-semibold text-sm text-slate-900">{{ p.name }}</p>
              <p class="font-mono text-xs text-slate-400">Barcode: {{ p.barcode }} | Estoque: {{ formatNumber(p.currentStock) }} {{ p.unit }}</p>
            </div>
            <div class="text-right">
              <span class="font-bold text-emerald-700 text-sm">{{ formatMoney(p.salePrice) }}</span>
              <span class="block text-[10px] text-emerald-600 font-semibold mt-0.5">+ Adicionar</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sale Completed Receipt Modal -->
    <div
      v-if="isReceiptModalOpen && completedSale"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 print:m-0 print:p-0 print:border-none">
        <div class="text-center pb-4 border-b border-dashed border-slate-300">
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
            <CheckCircle2 class="h-7 w-7" />
          </div>
          <h2 class="text-lg font-bold text-slate-900">Venda Finalizada com Sucesso!</h2>
          <p class="text-xs font-mono text-slate-500 mt-0.5">Cupom de Venda: {{ completedSale.code }}</p>
          <p class="text-[11px] text-slate-400">{{ new Date(completedSale.createdAt).toLocaleString('pt-BR') }}</p>
        </div>

        <!-- Receipt Items -->
        <div class="py-4 space-y-2 text-xs border-b border-dashed border-slate-300 max-h-56 overflow-y-auto">
          <div v-for="item in completedSale.items" :key="item.id" class="flex justify-between">
            <div>
              <p class="font-medium text-slate-800">{{ item.product?.name }}</p>
              <p class="font-mono text-[10px] text-slate-400">{{ formatNumber(item.quantity) }} x {{ formatMoney(item.unitPrice) }}</p>
            </div>
            <span class="font-mono font-bold text-slate-900">{{ formatMoney(item.subtotal) }}</span>
          </div>
        </div>

        <!-- Receipt Totals -->
        <div class="py-3 space-y-1 text-xs">
          <div class="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span class="font-mono">{{ formatMoney(completedSale.subtotal) }}</span>
          </div>
          <div v-if="Number(completedSale.discount) > 0" class="flex justify-between text-amber-700">
            <span>Desconto:</span>
            <span class="font-mono">- {{ formatMoney(completedSale.discount) }}</span>
          </div>
          <div class="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
            <span>Total Pago ({{ completedSale.paymentMethod }}):</span>
            <span class="font-mono text-emerald-700">{{ formatMoney(completedSale.total) }}</span>
          </div>
        </div>

        <!-- Receipt Actions -->
        <div class="mt-4 flex gap-2 pt-3 border-t border-slate-100 print:hidden">
          <button
            type="button"
            @click="printReceipt"
            class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Printer class="h-4 w-4" />
            <span>Imprimir Cupom</span>
          </button>

          <button
            type="button"
            @click="startNewSale"
            class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
          >
            <span>Nova Venda (F2)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
