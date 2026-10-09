<script setup lang="ts">
import {
  Search,
  ShoppingCart,
  Wallet,
  Package,
  Boxes,
  CalendarClock,
  Tags,
  Truck,
  Users,
  BarChart3,
  UserCog,
  ArrowRight,
  Plus,
  CornerDownLeft,
  X
} from 'lucide-vue-next'

const isOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const router = useRouter()
const { hasRole } = useAuth()

// Fetch produtos para busca rápida
const { data: productsData } = await useFetch<{ products: any[] }>('/api/products', {
  query: { active: 'true' }
})
const allProducts = computed(() => productsData.value?.products || [])

const navigationItems = [
  { name: 'Dashboard Principal', path: '/', icon: BarChart3, category: 'Navegação' },
  { name: 'PDV / Frente de Caixa', path: '/pos', icon: ShoppingCart, category: 'Navegação' },
  { name: 'Controle de Caixa & Turnos', path: '/cash', icon: Wallet, category: 'Navegação' },
  { name: 'Catálogo de Produtos', path: '/products', icon: Package, category: 'Navegação' },
  { name: 'Estoque & Entradas de Nota', path: '/stock', icon: Boxes, category: 'Navegação' },
  { name: 'Controle de Lotes & Validade', path: '/batches', icon: CalendarClock, category: 'Navegação' },
  { name: 'Gestão de Categorias', path: '/categories', icon: Tags, category: 'Navegação' },
  { name: 'Gestão de Fornecedores', path: '/suppliers', icon: Truck, category: 'Navegação' },
  { name: 'Cadastro de Clientes', path: '/customers', icon: Users, category: 'Navegação' },
  { name: 'Relatórios Gerenciais', path: '/reports', icon: BarChart3, category: 'Navegação' },
  { name: 'Gerenciamento de Usuários', path: '/users', icon: UserCog, category: 'Navegação' }
]

const quickActions = [
  { name: 'Iniciar Venda no PDV (F2)', path: '/pos', icon: ShoppingCart },
  { name: 'Abrir / Fechar Caixa', path: '/cash', icon: Wallet },
  { name: 'Cadastrar Novo Produto', path: '/products', icon: Plus },
  { name: 'Registrar Entrada de Mercadoria', path: '/stock', icon: Boxes }
]

// Filtros inteligentes
const filteredNav = computed(() => {
  if (!searchQuery.value) return navigationItems
  const q = searchQuery.value.toLowerCase()
  return navigationItems.filter(item => item.name.toLowerCase().includes(q))
})

const filteredProducts = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return []
  const q = searchQuery.value.toLowerCase()
  return allProducts.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.barcode.includes(q) ||
    p.sku.toLowerCase().includes(q)
  ).slice(0, 5)
})

const openPalette = () => {
  isOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const closePalette = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const navigateTo = (path: string) => {
  closePalette()
  router.push(path)
}

// Global Hotkey Ctrl+K / Cmd+K
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      if (isOpen.value) closePalette()
      else openPalette()
    } else if (e.key === 'Escape' && isOpen.value) {
      closePalette()
    }
  }

  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})

// Expor método para abrir programaticamente
defineExpose({
  open: openPalette,
  close: closePalette
})
</script>

<template>
  <div>
    <!-- Botão de Trigger visível no Header ou disponível globalmente -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      @click.self="closePalette"
    >
      <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
        <!-- Input de busca -->
        <div class="relative flex items-center border-b border-slate-100 px-4 py-3.5 bg-slate-50/50">
          <Search class="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Pesquise por página, produto, código de barras ou ação..."
            class="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd class="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
            ESC
          </kbd>
        </div>

        <!-- Lista de Resultados -->
        <div class="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          <!-- Produtos Encontrados -->
          <div v-if="filteredProducts.length > 0">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Produtos no Catálogo ({{ filteredProducts.length }})
            </span>
            <div class="mt-1 space-y-1">
              <button
                v-for="prod in filteredProducts"
                :key="prod.id"
                @click="navigateTo(`/products?q=${encodeURIComponent(prod.name)}`)"
                class="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/70 text-left transition cursor-pointer group"
              >
                <div class="flex items-center gap-2.5">
                  <div class="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Package class="h-4 w-4" />
                  </div>
                  <div>
                    <span class="font-bold text-slate-800 text-xs block group-hover:text-emerald-800">{{ prod.name }}</span>
                    <span class="text-[10px] text-slate-400 font-mono">Barcode: {{ prod.barcode }} · Estoque: {{ prod.currentStock }} {{ prod.unit }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="font-bold text-emerald-700 text-xs">R$ {{ Number(prod.salePrice).toFixed(2) }}</span>
                  <span class="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                    Acessar <ArrowRight class="h-3 w-3" />
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Ações Rápidas -->
          <div v-if="!searchQuery && quickActions.length > 0">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Ações Imediatas
            </span>
            <div class="mt-1 grid grid-cols-2 gap-1.5">
              <button
                v-for="act in quickActions"
                :key="act.name"
                @click="navigateTo(act.path)"
                class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 text-left transition cursor-pointer"
              >
                <component :is="act.icon" class="h-4 w-4 text-emerald-600 shrink-0" />
                <span class="font-semibold text-slate-700 text-[11px] truncate">{{ act.name }}</span>
              </button>
            </div>
          </div>

          <!-- Módulos & Navegação -->
          <div>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Módulos do Sistema
            </span>
            <div class="mt-1 space-y-0.5">
              <button
                v-for="nav in filteredNav"
                :key="nav.path"
                @click="navigateTo(nav.path)"
                class="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 text-left transition cursor-pointer group"
              >
                <div class="flex items-center gap-2.5">
                  <component :is="nav.icon" class="h-4 w-4 text-slate-500 group-hover:text-emerald-600" />
                  <span class="font-medium text-slate-800">{{ nav.name }}</span>
                </div>
                <CornerDownLeft class="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
              </button>
            </div>
          </div>
        </div>

        <!-- Footer da Paleta -->
        <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div class="flex items-center gap-2">
            <span>Use <kbd class="font-mono bg-white px-1.5 py-0.5 border rounded">Ctrl</kbd> + <kbd class="font-mono bg-white px-1.5 py-0.5 border rounded">K</kbd> a qualquer momento</span>
          </div>
          <span>EstoquePro</span>
        </div>
      </div>
    </div>
  </div>
</template>
