<script setup lang="ts">
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Boxes,
  DollarSign,
  Layers,
  Sparkles,
  Eye,
  Download,
  Upload,
  Printer,
  FileSpreadsheet,
  Tag,
  FileUp
} from 'lucide-vue-next'
import { generateBarcodeSvg } from '../utils/barcode'

const { hasRole } = useAuth()
const canManage = computed(() => hasRole(['ADMIN', 'MANAGER']))

interface ProductItem {
  id: number
  sku: string
  barcode: string
  name: string
  description: string | null
  categoryId: number
  categoryName: string | null
  supplierId: number | null
  supplierName: string | null
  costPrice: string
  salePrice: string
  currentStock: string
  minimumStock: string
  maximumStock: string
  unit: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface CategoryOption {
  id: number
  name: string
}

interface SupplierOption {
  id: number
  name: string
}

const searchQuery = ref('')
const selectedCategory = ref<number | ''>('')
const selectedStatus = ref<'all' | 'true' | 'false'>('all')
const lowStockOnly = ref(false)

// Fetch products with reactive filters
const { data: productsData, refresh, pending } = await useFetch<{ products: ProductItem[] }>('/api/products', {
  query: computed(() => ({
    q: searchQuery.value || undefined,
    category_id: selectedCategory.value || undefined,
    active: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
    low_stock: lowStockOnly.value ? 'true' : undefined
  }))
})

const productsList = computed(() => productsData.value?.products || [])

// Fetch categories and suppliers for form select dropdowns
const { data: categoriesData } = await useFetch<{ categories: CategoryOption[] }>('/api/categories', {
  query: { active: 'true' }
})
const { data: suppliersData } = await useFetch<{ suppliers: SupplierOption[] }>('/api/suppliers', {
  query: { active: 'true' }
})

const categoriesList = computed(() => categoriesData.value?.categories || [])
const suppliersList = computed(() => suppliersData.value?.suppliers || [])

// Stats computed
const totalProducts = computed(() => productsList.value.length)
const lowStockCount = computed(() =>
  productsList.value.filter(p => Number(p.currentStock) <= Number(p.minimumStock)).length
)
const totalStockValue = computed(() =>
  productsList.value.reduce((acc, p) => acc + (Number(p.costPrice) * Number(p.currentStock)), 0)
)
const totalPotentialSales = computed(() =>
  productsList.value.reduce((acc, p) => acc + (Number(p.salePrice) * Number(p.currentStock)), 0)
)

// Modal state
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  id: 0,
  sku: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: null as number | null,
  supplierId: null as number | null,
  costPrice: 0,
  salePrice: 0,
  initialStock: 0,
  minimumStock: 5,
  maximumStock: 100,
  unit: 'UN',
  active: true
})

// Delete modal state
const isDeleteModalOpen = ref(false)
const productToDelete = ref<ProductItem | null>(null)
const isDeleting = ref(false)
const deleteErrorMessage = ref('')

const openCreateModal = () => {
  isEditing.value = false
  errorMessage.value = ''
  form.value = {
    id: 0,
    sku: 'PROD-' + Math.floor(1000 + Math.random() * 9000),
    barcode: '',
    name: '',
    description: '',
    categoryId: categoriesList.value[0]?.id || null,
    supplierId: suppliersList.value[0]?.id || null,
    costPrice: 0,
    salePrice: 0,
    initialStock: 0,
    minimumStock: 5,
    maximumStock: 100,
    unit: 'UN',
    active: true
  }
  isModalOpen.value = true
}

const openEditModal = (prod: ProductItem) => {
  isEditing.value = true
  errorMessage.value = ''
  form.value = {
    id: prod.id,
    sku: prod.sku,
    barcode: prod.barcode,
    name: prod.name,
    description: prod.description || '',
    categoryId: prod.categoryId,
    supplierId: prod.supplierId,
    costPrice: Number(prod.costPrice),
    salePrice: Number(prod.salePrice),
    initialStock: Number(prod.currentStock),
    minimumStock: Number(prod.minimumStock),
    maximumStock: Number(prod.maximumStock),
    unit: prod.unit,
    active: prod.active
  }
  isModalOpen.value = true
}

const generateRandomBarcode = () => {
  // Gera um EAN-13 fictício com prefixo nacional 789
  let code = '789'
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10)
  }
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const checkDigit = (10 - (sum % 10)) % 10
  form.value.barcode = code + checkDigit
}

const calculatedMargin = computed(() => {
  const cost = Number(form.value.costPrice) || 0
  const sale = Number(form.value.salePrice) || 0
  if (cost <= 0 || sale <= 0) return { profit: 0, percentage: 0 }
  const profit = sale - cost
  const percentage = (profit / cost) * 100
  return { profit, percentage }
})

const saveProduct = async () => {
  isSaving.value = true
  errorMessage.value = ''

  try {
    if (isEditing.value) {
      await $fetch(`/api/products/${form.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      successMessage.value = 'Produto atualizado com sucesso!'
    } else {
      await $fetch('/api/products', {
        method: 'POST',
        body: form.value
      })
      successMessage.value = 'Produto cadastrado com sucesso!'
    }
    isModalOpen.value = false
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 3500)
  } catch (err: any) {
    errorMessage.value =
      err.data?.message ||
      err.data?.data?.errors?.barcode?.[0] ||
      err.data?.data?.errors?.sku?.[0] ||
      err.data?.data?.errors?.name?.[0] ||
      'Erro ao salvar produto'
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (prod: ProductItem) => {
  productToDelete.value = prod
  deleteErrorMessage.value = ''
  isDeleteModalOpen.value = true
}

const executeDelete = async () => {
  if (!productToDelete.value) return
  isDeleting.value = true
  deleteErrorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>(`/api/products/${productToDelete.value.id}`, {
      method: 'DELETE'
    })
    isDeleteModalOpen.value = false
    successMessage.value = res.message
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 3500)
  } catch (err: any) {
    deleteErrorMessage.value = err.data?.message || 'Erro ao excluir produto'
  } finally {
    isDeleting.value = false
  }
}

const formatMoney = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatNumber = (v: string | number) => {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

// --- 1. EXPORTAÇÃO CSV COMPLETA ---
const exportProductsCsv = () => {
  const headers = ['ID', 'Nome', 'Codigo_Barras', 'SKU', 'Categoria', 'Fornecedor', 'Preco_Custo', 'Preco_Venda', 'Estoque_Atual', 'Estoque_Minimo', 'Unidade', 'Status']
  const rows = productsList.value.map(p => [
    p.id.toString(),
    p.name,
    p.barcode,
    p.sku,
    p.categoryName || '',
    p.supplierName || '',
    Number(p.costPrice).toFixed(2),
    Number(p.salePrice).toFixed(2),
    Number(p.currentStock).toFixed(3),
    Number(p.minimumStock).toFixed(3),
    p.unit,
    p.active ? 'Ativo' : 'Inativo'
  ])

  const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `produtos-estoquepro-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// --- 2. IMPORTAÇÃO CSV EM LOTE ---
const isImportModalOpen = ref(false)
const isImporting = ref(false)
const importErrorMessage = ref('')
const parsedImportItems = ref<any[]>([])

const handleCsvFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importErrorMessage.value = ''
  parsedImportItems.value = []

  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length < 2) {
      importErrorMessage.value = 'O arquivo CSV precisa ter ao menos a linha de cabeçalho e um produto.'
      return
    }

    const separator = lines[0].includes(';') ? ';' : ','
    const parseLine = (line: string) => {
      const regex = new RegExp(`(?:"([^"]*(?:""[^"]*)*)"|([^${separator}]+)|(?=${separator}|$))`, 'g')
      const matches: string[] = []
      let match
      while ((match = regex.exec(line)) !== null) {
        if (match.index === regex.lastIndex) regex.lastIndex++
        matches.push(match[1] ? match[1].replace(/""/g, '"').trim() : (match[2] || '').trim())
      }
      return matches.slice(0, matches.length - 1)
    }

    const rawHeader = parseLine(lines[0])
    const header = rawHeader.map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''))

    const nameIdx = header.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('produto') || h.includes('descricao'))
    const barcodeIdx = header.findIndex(h => h.includes('barcode') || h.includes('codigo') || h.includes('barras') || h.includes('ean'))
    const skuIdx = header.findIndex(h => h.includes('sku') || h.includes('cod'))
    const catIdx = header.findIndex(h => h.includes('categoria') || h.includes('cat') || h.includes('category'))
    const costIdx = header.findIndex(h => h.includes('custo') || h.includes('precocusto') || h.includes('cost'))
    const saleIdx = header.findIndex(h => h.includes('venda') || h.includes('precovenda') || h.includes('preco') || h.includes('price'))
    const stockIdx = header.findIndex(h => h.includes('estoque') || h.includes('qtd') || h.includes('saldo') || h.includes('quant'))
    const minIdx = header.findIndex(h => h.includes('min') || h.includes('minimo'))
    const unitIdx = header.findIndex(h => h.includes('unidade') || h.includes('unit') || h.includes('un'))

    const parsed: any[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i])
      if (!cols.length || cols.every(c => !c)) continue

      const name = nameIdx >= 0 ? cols[nameIdx] : cols[1] || ''
      if (!name) continue

      const barcode = (barcodeIdx >= 0 && cols[barcodeIdx]) ? cols[barcodeIdx] : Math.floor(7890000000000 + Math.random() * 999999999).toString()
      const sku = (skuIdx >= 0 && cols[skuIdx]) ? cols[skuIdx] : ('SKU-' + Math.floor(1000 + Math.random() * 9000))
      const catName = catIdx >= 0 ? cols[catIdx] : ''
      const cost = Number((costIdx >= 0 ? cols[costIdx] : '0').replace('R$', '').replace(',', '.').trim()) || 0
      const sale = Number((saleIdx >= 0 ? cols[saleIdx] : '0').replace('R$', '').replace(',', '.').trim()) || 0
      const stock = Number((stockIdx >= 0 ? cols[stockIdx] : '0').replace(',', '.').trim()) || 0
      const minStock = Number((minIdx >= 0 ? cols[minIdx] : '5').replace(',', '.').trim()) || 5
      const unit = ((unitIdx >= 0 ? cols[unitIdx] : 'UN') || 'UN').trim()

      parsed.push({
        name,
        barcode,
        sku,
        categoryName: catName,
        costPrice: cost,
        salePrice: sale,
        currentStock: stock,
        minimumStock: minStock,
        unit
      })
    }

    if (!parsed.length) {
      importErrorMessage.value = 'Nenhum produto válido encontrado. Verifique o modelo das colunas.'
      return
    }

    parsedImportItems.value = parsed
  } catch (err: any) {
    importErrorMessage.value = 'Falha ao ler planilha: ' + (err.message || 'Erro desconhecido')
  }
}

const submitImport = async () => {
  if (!parsedImportItems.value.length) return
  isImporting.value = true
  importErrorMessage.value = ''

  try {
    const res: any = await $fetch('/api/products/import', {
      method: 'POST',
      body: { items: parsedImportItems.value }
    })
    successMessage.value = res.message || 'Importação realizada com sucesso!'
    isImportModalOpen.value = false
    parsedImportItems.value = []
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 4000)
  } catch (err: any) {
    importErrorMessage.value = err.data?.message || 'Erro ao importar produtos'
  } finally {
    isImporting.value = false
  }
}

// --- 3. ETIQUETAS DE CÓDIGO DE BARRAS ---
const isLabelModalOpen = ref(false)
const labelProductMode = ref<'SELECTED' | 'ALL'>('SELECTED')
const selectedLabelProductId = ref<number | null>(null)
const labelCopies = ref(1)
const labelLayout = ref<'GONDOLA' | 'COMPACT'>('GONDOLA')

const openLabelModalForProduct = (prod?: ProductItem) => {
  if (prod) {
    labelProductMode.value = 'SELECTED'
    selectedLabelProductId.value = prod.id
  } else {
    selectedLabelProductId.value = productsList.value[0]?.id || null
  }
  isLabelModalOpen.value = true
}

const activeLabelProducts = computed(() => {
  if (labelProductMode.value === 'ALL') {
    return productsList.value
  }
  const found = productsList.value.find(p => p.id === selectedLabelProductId.value)
  return found ? [found] : []
})

const printLabels = () => {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Package class="h-7 w-7 text-emerald-600" />
          Catálogo de Produtos
        </h1>
        <p class="text-sm text-slate-500 mt-1">Gerencie preços, estoque mínimo, código de barras e categorias</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="exportProductsCsv"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          title="Baixar planilha CSV com todos os produtos"
        >
          <Download class="h-3.5 w-3.5 text-slate-500" />
          <span>Exportar CSV</span>
        </button>

        <button
          v-if="canManage"
          @click="isImportModalOpen = true"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          title="Importar produtos em lote via arquivo CSV"
        >
          <Upload class="h-3.5 w-3.5 text-slate-500" />
          <span>Importar Planilha</span>
        </button>

        <button
          @click="openLabelModalForProduct()"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          title="Gerar e imprimir etiquetas de código de barras"
        >
          <Printer class="h-3.5 w-3.5 text-slate-500" />
          <span>Etiquetas</span>
        </button>

        <NuxtLink
          to="/pos"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
        >
          <Barcode class="h-3.5 w-3.5 text-emerald-600" />
          <span>PDV</span>
        </NuxtLink>

        <button
          v-if="canManage"
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Novo Produto</span>
        </button>
      </div>
    </div>

    <!-- Success Feedback Alert -->
    <div
      v-if="successMessage"
      class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 animate-in fade-in"
    >
      <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Metrics Cards Summary -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Total de Itens</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Package class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-2">{{ totalProducts }}</p>
        <p class="text-xs text-slate-500 mt-1">Produtos no catálogo</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Estoque Baixo</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-amber-600 mt-2">{{ lowStockCount }}</p>
        <p class="text-xs text-slate-500 mt-1">Itens em ponto de pedido</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Custo em Estoque</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Boxes class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-2">{{ formatMoney(totalStockValue) }}</p>
        <p class="text-xs text-slate-500 mt-1">Valor investido no estoque</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Venda Projetada</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-emerald-600 mt-2">{{ formatMoney(totalPotentialSales) }}</p>
        <p class="text-xs text-slate-500 mt-1">Faturamento potencial</p>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-col lg:flex-row gap-3 items-center justify-between">
      <div class="relative w-full lg:w-96">
        <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por código de barras, SKU ou nome..."
          class="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
        <!-- Category Filter -->
        <select
          v-model="selectedCategory"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
        >
          <option value="">Todas as Categorias</option>
          <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="selectedStatus"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
        >
          <option value="all">Todos os Status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>

        <!-- Low stock toggle button -->
        <button
          type="button"
          @click="lowStockOnly = !lowStockOnly"
          :class="[
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer shadow-2xs',
            lowStockOnly
              ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/20'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          ]"
        >
          <AlertTriangle class="h-3.5 w-3.5 text-amber-600" />
          <span>Apenas Estoque Baixo</span>
        </button>
      </div>
    </div>

    <!-- Products Table -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div v-if="pending" class="flex justify-center items-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
      </div>

      <div v-else-if="productsList.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <Package class="h-6 w-6" />
        </div>
        <p class="font-semibold text-slate-800">Nenhum produto encontrado</p>
        <p class="text-xs text-slate-500 mt-1 max-w-sm">Tente ajustar seus termos de busca ou cadastre um novo produto.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3.5">Código / Barcode</th>
              <th class="px-6 py-3.5">Produto</th>
              <th class="px-6 py-3.5">Categoria / Fornecedor</th>
              <th class="px-6 py-3.5">Preço Venda (Custo)</th>
              <th class="px-6 py-3.5">Estoque Atual</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="prod in productsList" :key="prod.id" class="hover:bg-slate-50/80 transition">
              <!-- Barcode & SKU -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800">
                  <Barcode class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ prod.barcode }}</span>
                </div>
                <div class="text-[11px] font-mono text-slate-400 mt-0.5">
                  SKU: {{ prod.sku }}
                </div>
              </td>

              <!-- Product Name -->
              <td class="px-6 py-4">
                <span class="font-semibold text-slate-900 block">{{ prod.name }}</span>
                <span class="text-xs text-slate-500 truncate max-w-xs block">{{ prod.description || 'Sem descrição' }}</span>
              </td>

              <!-- Category / Supplier -->
              <td class="px-6 py-4 text-xs space-y-1">
                <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  <Layers class="h-3 w-3 text-slate-400" />
                  {{ prod.categoryName || 'Sem Categoria' }}
                </span>
                <div v-if="prod.supplierName" class="text-[11px] text-slate-500 truncate max-w-[180px]">
                  {{ prod.supplierName }}
                </div>
              </td>

              <!-- Price & Margin -->
              <td class="px-6 py-4">
                <div class="font-bold text-slate-900 text-sm">
                  {{ formatMoney(prod.salePrice) }}
                </div>
                <div class="text-[11px] text-slate-400">
                  Custo: {{ formatMoney(prod.costPrice) }}
                </div>
              </td>

              <!-- Stock & Min Alert -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'text-sm font-bold',
                      Number(prod.currentStock) <= 0 ? 'text-rose-600' :
                      Number(prod.currentStock) <= Number(prod.minimumStock) ? 'text-amber-600' :
                      'text-emerald-700'
                    ]"
                  >
                    {{ formatNumber(prod.currentStock) }} {{ prod.unit }}
                  </span>

                  <!-- Low stock badge -->
                  <span
                    v-if="Number(prod.currentStock) <= Number(prod.minimumStock)"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                    title="Abaixo do estoque mínimo!"
                  >
                    <AlertTriangle class="h-3 w-3" />
                    Baixo
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  Mín: {{ formatNumber(prod.minimumStock) }} | Máx: {{ formatNumber(prod.maximumStock) }}
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    prod.active ? 'text-emerald-600' : 'text-slate-400'
                  ]"
                >
                  <span :class="['h-2 w-2 rounded-full', prod.active ? 'bg-emerald-500' : 'bg-slate-300']"></span>
                  {{ prod.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="openLabelModalForProduct(prod)"
                    class="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer"
                    title="Imprimir etiquetas de código de barras deste produto"
                  >
                    <Printer class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canManage"
                    @click="openEditModal(prod)"
                    class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                    title="Editar produto"
                  >
                    <Edit2 class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canManage"
                    @click="confirmDelete(prod)"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Excluir ou desativar produto"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Product Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package class="h-5 w-5 text-emerald-600" />
            {{ isEditing ? 'Editar Produto' : 'Cadastrar Novo Produto' }}
          </h2>
          <span class="text-xs text-slate-400 font-medium">Campos com * são obrigatórios</span>
        </div>

        <div v-if="errorMessage" class="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="saveProduct" class="space-y-4">
          <!-- Identificação -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Código de Barras (EAN-13 / Scanner) *
              </label>
              <div class="flex gap-2">
                <input
                  v-model="form.barcode"
                  type="text"
                  required
                  class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                  placeholder="Passe o leitor ou digite..."
                />
                <button
                  type="button"
                  @click="generateRandomBarcode"
                  title="Gerar código aleatório"
                  class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Sparkles class="h-3.5 w-3.5 text-amber-500" />
                  Gerar
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">SKU / Código Interno *</label>
              <input
                v-model="form.sku"
                type="text"
                required
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono uppercase"
                placeholder="Ex: BEB-COC-2000"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nome do Produto *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ex: Coca-Cola Original Garrafa PET 2 Litros"
            />
          </div>

          <!-- Categoria e Fornecedor -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
              <select
                v-model="form.categoryId"
                required
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option :value="null" disabled>Selecione uma categoria</option>
                <option v-for="cat in categoriesList" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Fornecedor Principal</label>
              <select
                v-model="form.supplierId"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option :value="null">Nenhum / Não informado</option>
                <option v-for="sup in suppliersList" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Preços & Margem -->
          <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign class="h-3.5 w-3.5 text-emerald-600" />
              Preços & Lucratividade
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Preço de Custo (R$) *</label>
                <input
                  v-model.number="form.costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Preço de Venda (R$) *</label>
                <input
                  v-model.number="form.salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div class="flex flex-col justify-center bg-white rounded-xl border border-slate-200 p-2.5">
                <span class="text-[11px] text-slate-500 font-medium">Margem de Lucro:</span>
                <div class="flex items-center gap-1.5">
                  <span
                    :class="[
                      'text-sm font-bold',
                      calculatedMargin.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    ]"
                  >
                    {{ formatMoney(calculatedMargin.profit) }}
                  </span>
                  <span class="text-xs text-slate-400 font-mono">
                    ({{ calculatedMargin.percentage.toFixed(1) }}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Estoque e Unidade -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div v-if="!isEditing">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estoque Inicial</label>
              <input
                v-model.number="form.initialStock"
                type="number"
                step="0.001"
                min="0"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estoque Mínimo *</label>
              <input
                v-model.number="form.minimumStock"
                type="number"
                step="0.001"
                min="0"
                required
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estoque Máximo</label>
              <input
                v-model.number="form.maximumStock"
                type="number"
                step="0.001"
                min="0"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Unidade *</label>
              <select
                v-model="form.unit"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="KG">KG (Quilo)</option>
                <option value="L">L (Litro)</option>
                <option value="PCT">PCT (Pacote)</option>
                <option value="CX">CX (Caixa)</option>
                <option value="GAR">GAR (Garrafa)</option>
                <option value="LATA">LATA (Lata)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Descrição Detalhada</label>
            <textarea
              v-model="form.description"
              rows="2"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Detalhes, especificações ou características do produto..."
            ></textarea>
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
              <span>{{ isEditing ? 'Salvar Alterações' : 'Cadastrar Produto' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="isDeleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <div class="flex items-center gap-3 text-rose-600 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-100">
            <Trash2 class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Excluir / Desativar</h2>
            <p class="text-xs text-slate-500">Confirmação de ação</p>
          </div>
        </div>

        <p class="text-sm text-slate-600 mb-4">
          Deseja realmente remover o produto <strong class="text-slate-900 font-semibold">"{{ productToDelete?.name }}"</strong>?
        </p>

        <div v-if="deleteErrorMessage" class="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200 leading-relaxed">
          <AlertCircle class="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{{ deleteErrorMessage }}</span>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            @click="isDeleteModalOpen = false"
            class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            @click="executeDelete"
            :disabled="isDeleting"
            class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 transition disabled:opacity-50 cursor-pointer"
          >
            <Loader2 v-if="isDeleting" class="h-4 w-4 animate-spin" />
            <span>Confirmar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL IMPORTAÇÃO CSV EM LOTE -->
    <div
      v-if="isImportModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Upload class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Importação de Produtos via Planilha</h2>
              <p class="text-xs text-slate-500">Cadastre ou atualize múltiplos produtos em lote</p>
            </div>
          </div>
          <button @click="isImportModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <div class="space-y-4">
          <!-- Instruções de formato -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <p class="font-semibold text-slate-800">Formato e colunas aceitas (CSV com ; ou ,):</p>
            <p class="font-mono text-[11px] text-slate-500">Nome, Codigo_Barras, SKU, Categoria, Preco_Custo, Preco_Venda, Estoque_Atual, Estoque_Minimo, Unidade</p>
            <p class="text-[11px] text-slate-400">Produtos com código de barras ou SKU já existentes serão atualizados automaticamente.</p>
          </div>

          <!-- Upload Dropzone -->
          <div class="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition cursor-pointer relative bg-slate-50/50">
            <input
              type="file"
              accept=".csv,text/csv"
              @change="handleCsvFileUpload"
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div class="flex flex-col items-center">
              <FileSpreadsheet class="h-10 w-10 text-emerald-600 mb-2" />
              <p class="text-sm font-semibold text-slate-800">Selecione ou arraste seu arquivo .CSV aqui</p>
              <p class="text-xs text-slate-400 mt-1">Compatível com Excel, Google Sheets e LibreOffice</p>
            </div>
          </div>

          <!-- Mensagens de erro -->
          <div v-if="importErrorMessage" class="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle class="h-4 w-4 shrink-0 text-rose-600" />
            <span>{{ importErrorMessage }}</span>
          </div>

          <!-- Preview dos dados parseados -->
          <div v-if="parsedImportItems.length > 0" class="space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Pré-visualização ({{ parsedImportItems.length }} produtos identificados):</span>
              <span class="text-emerald-600 font-bold">Pronto para importar</span>
            </div>

            <div class="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
              <div
                v-for="(it, idx) in parsedImportItems.slice(0, 5)"
                :key="idx"
                class="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50"
              >
                <div>
                  <span class="font-bold text-slate-800">{{ it.name }}</span>
                  <span class="text-[10px] text-slate-400 block font-mono">Bar: {{ it.barcode }} | SKU: {{ it.sku }}</span>
                </div>
                <div class="text-right">
                  <span class="font-bold text-emerald-700">{{ formatMoney(it.salePrice) }}</span>
                  <span class="text-[10px] text-slate-400 block">{{ it.currentStock }} {{ it.unit }}</span>
                </div>
              </div>
              <div v-if="parsedImportItems.length > 5" class="p-2 text-center text-[11px] text-slate-400 bg-slate-50">
                ... e mais {{ parsedImportItems.length - 5 }} produto(s)
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="isImportModalOpen = false; parsedImportItems = []"
              class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              @click="submitImport"
              :disabled="!parsedImportItems.length || isImporting"
              class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Loader2 v-if="isImporting" class="h-3.5 w-3.5 animate-spin" />
              <span>Confirmar Importação ({{ parsedImportItems.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL GERADOR E IMPRESSÃO DE ETIQUETAS DE CÓDIGO DE BARRAS -->
    <div
      v-if="isLabelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Printer class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900">Gerador & Impressão de Etiquetas</h2>
              <p class="text-xs text-slate-500">Impressão térmica e gôndola com código de barras Code 128</p>
            </div>
          </div>
          <button @click="isLabelModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <div class="space-y-4">
          <!-- Opções de Configuração -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Modelo de Etiqueta</label>
              <select
                v-model="labelLayout"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="GONDOLA">Gôndola / Prateleira (Grande)</option>
                <option value="COMPACT">Adesivo Produto (Compacta)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Produtos</label>
              <select
                v-model="labelProductMode"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="SELECTED">Apenas Produto Selecionado</option>
                <option value="ALL">Todos os Produtos Filtrados</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Cópias por Produto</label>
              <input
                v-model.number="labelCopies"
                type="number"
                min="1"
                max="50"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div v-if="labelProductMode === 'SELECTED'" class="space-y-1">
            <label class="block text-xs font-semibold text-slate-700">Selecione o Produto:</label>
            <select
              v-model="selectedLabelProductId"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option v-for="p in productsList" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.barcode }}) - {{ formatMoney(p.salePrice) }}
              </option>
            </select>
          </div>

          <!-- Pré-visualização da Etiqueta -->
          <div>
            <span class="text-xs font-semibold text-slate-700 block mb-2">Pré-visualização da Etiqueta:</span>
            <div class="p-6 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center justify-center">
              <div v-if="activeLabelProducts.length > 0">
                <!-- Modelo Gôndola -->
                <div
                  v-if="labelLayout === 'GONDOLA'"
                  class="bg-white border-2 border-slate-900 rounded-lg p-3 w-72 shadow-sm text-slate-900 text-left font-sans"
                >
                  <div class="border-b border-slate-200 pb-1 mb-2">
                    <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">EstoquePro Supermercado</span>
                    <h4 class="font-black text-xs leading-tight line-clamp-1 uppercase">{{ activeLabelProducts[0]?.name }}</h4>
                  </div>

                  <div class="flex items-end justify-between my-2">
                    <div>
                      <span class="text-[9px] text-slate-500 block">Preço à vista</span>
                      <span class="text-2xl font-black text-slate-950 tracking-tight leading-none">
                        {{ formatMoney(activeLabelProducts[0]?.salePrice) }}
                      </span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                      {{ activeLabelProducts[0]?.unit }}
                    </span>
                  </div>

                  <div
                    class="pt-1 text-center overflow-hidden flex justify-center"
                    v-html="generateBarcodeSvg(activeLabelProducts[0]?.barcode, { height: 35, moduleWidth: 1.5 })"
                  ></div>
                  <div class="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                    <span>SKU: {{ activeLabelProducts[0]?.sku }}</span>
                    <span>{{ new Date().toLocaleDateString('pt-BR') }}</span>
                  </div>
                </div>

                <!-- Modelo Compacto -->
                <div
                  v-else
                  class="bg-white border border-slate-300 rounded p-2 w-48 shadow-sm text-center font-sans text-slate-900"
                >
                  <p class="font-bold text-[11px] truncate leading-tight">{{ activeLabelProducts[0]?.name }}</p>
                  <p class="font-black text-sm text-slate-950 my-0.5">{{ formatMoney(activeLabelProducts[0]?.salePrice) }}</p>
                  <div
                    class="overflow-hidden flex justify-center"
                    v-html="generateBarcodeSvg(activeLabelProducts[0]?.barcode, { height: 25, moduleWidth: 1.2 })"
                  ></div>
                </div>
              </div>
              <div v-else class="text-xs text-slate-400 italic">
                Nenhum produto selecionado para gerar etiqueta.
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <span class="text-xs text-slate-500">
              Total a imprimir: <strong>{{ activeLabelProducts.length * (labelCopies || 1) }}</strong> etiqueta(s)
            </span>

            <div class="flex gap-2">
              <button
                type="button"
                @click="isLabelModalOpen = false"
                class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                @click="printLabels"
                class="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer class="h-4 w-4" />
                <span>Imprimir Etiquetas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ÁREA DE IMPRESSÃO PURA DE ETIQUETAS (@media print) -->
    <div id="labels-print-area" class="hidden print:block fixed inset-0 bg-white p-2 z-9999">
      <div class="flex flex-wrap gap-2 justify-start items-start">
        <template v-for="prod in activeLabelProducts" :key="prod.id">
          <template v-for="c in labelCopies" :key="c">
            <!-- Modelo Gôndola Impresso -->
            <div
              v-if="labelLayout === 'GONDOLA'"
              class="border border-black p-2 w-64 h-36 flex flex-col justify-between text-black break-inside-avoid mb-2"
              style="page-break-inside: avoid;"
            >
              <div>
                <p class="text-[8px] uppercase tracking-wider font-bold">ESTOQUEPRO</p>
                <p class="font-bold text-xs truncate uppercase leading-tight">{{ prod.name }}</p>
              </div>

              <div class="flex items-baseline justify-between my-1">
                <span class="text-xl font-black">{{ formatMoney(prod.salePrice) }}</span>
                <span class="text-[9px] font-bold">{{ prod.unit }}</span>
              </div>

              <div
                class="flex justify-center"
                v-html="generateBarcodeSvg(prod.barcode, { height: 28, moduleWidth: 1.2 })"
              ></div>
              <div class="flex justify-between text-[7px] font-mono text-gray-500">
                <span>SKU: {{ prod.sku }}</span>
                <span>{{ prod.barcode }}</span>
              </div>
            </div>

            <!-- Modelo Compacto Impresso -->
            <div
              v-else
              class="border border-black p-1.5 w-44 h-24 flex flex-col justify-between text-black text-center break-inside-avoid mb-2"
              style="page-break-inside: avoid;"
            >
              <p class="font-bold text-[10px] truncate">{{ prod.name }}</p>
              <p class="font-black text-xs leading-none">{{ formatMoney(prod.salePrice) }}</p>
              <div
                class="flex justify-center"
                v-html="generateBarcodeSvg(prod.barcode, { height: 22, moduleWidth: 1 })"
              ></div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

