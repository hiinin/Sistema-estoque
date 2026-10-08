<script setup lang="ts">
import {
  Tags,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers
} from 'lucide-vue-next'

definePageMeta({
  roles: ['ADMIN', 'MANAGER']
})

interface CategoryItem {
  id: number
  name: string
  description: string | null
  active: boolean
  productsCount: number
  createdAt: string
  updatedAt: string
}

const searchQuery = ref('')
const activeFilter = ref<'all' | 'true' | 'false'>('all')

const { data, refresh, pending } = await useFetch<{ categories: CategoryItem[] }>('/api/categories', {
  query: computed(() => ({
    q: searchQuery.value || undefined,
    active: activeFilter.value === 'all' ? undefined : activeFilter.value
  }))
})

const categoriesList = computed(() => data.value?.categories || [])

// Modal state
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  id: 0,
  name: '',
  description: '',
  active: true
})

// Delete modal state
const isDeleteModalOpen = ref(false)
const categoryToDelete = ref<CategoryItem | null>(null)
const isDeleting = ref(false)
const deleteErrorMessage = ref('')

const openCreateModal = () => {
  isEditing.value = false
  errorMessage.value = ''
  form.value = {
    id: 0,
    name: '',
    description: '',
    active: true
  }
  isModalOpen.value = true
}

const openEditModal = (cat: CategoryItem) => {
  isEditing.value = true
  errorMessage.value = ''
  form.value = {
    id: cat.id,
    name: cat.name,
    description: cat.description || '',
    active: cat.active
  }
  isModalOpen.value = true
}

const saveCategory = async () => {
  isSaving.value = true
  errorMessage.value = ''

  try {
    if (isEditing.value) {
      await $fetch(`/api/categories/${form.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      successMessage.value = 'Categoria atualizada com sucesso!'
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: form.value
      })
      successMessage.value = 'Categoria criada com sucesso!'
    }
    isModalOpen.value = false
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 3500)
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.data?.data?.errors?.name?.[0] || 'Erro ao salvar categoria'
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (cat: CategoryItem) => {
  categoryToDelete.value = cat
  deleteErrorMessage.value = ''
  isDeleteModalOpen.value = true
}

const executeDelete = async () => {
  if (!categoryToDelete.value) return
  isDeleting.value = true
  deleteErrorMessage.value = ''

  try {
    const res = await $fetch<{ message: string }>(`/api/categories/${categoryToDelete.value.id}`, {
      method: 'DELETE'
    })
    isDeleteModalOpen.value = false
    successMessage.value = res.message
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 3500)
  } catch (err: any) {
    deleteErrorMessage.value = err.data?.message || 'Erro ao excluir categoria'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Tags class="h-7 w-7 text-emerald-600" />
          Categorias de Produtos
        </h1>
        <p class="text-sm text-slate-500 mt-1">Organize o catálogo de produtos e departamentos da loja</p>
      </div>

      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        Nova Categoria
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

    <!-- Filter & Search Bar -->
    <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div class="relative w-full sm:w-80">
        <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome da categoria..."
          class="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <span class="text-xs font-medium text-slate-500">Status:</span>
        <select
          v-model="activeFilter"
          class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
        >
          <option value="all">Todas</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </select>
      </div>
    </div>

    <!-- Categories Table -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div v-if="pending" class="flex justify-center items-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
      </div>

      <div v-else-if="categoriesList.length === 0" class="flex flex-col items-center justify-center py-16 text-center px-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <Layers class="h-6 w-6" />
        </div>
        <p class="font-semibold text-slate-800">Nenhuma categoria encontrada</p>
        <p class="text-xs text-slate-500 mt-1 max-w-sm">Tente ajustar seus filtros de busca ou cadastre uma nova categoria.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3.5">Nome</th>
              <th class="px-6 py-3.5">Descrição</th>
              <th class="px-6 py-3.5">Produtos Vinculados</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="cat in categoriesList" :key="cat.id" class="hover:bg-slate-50/80 transition">
              <td class="px-6 py-4">
                <span class="font-semibold text-slate-900">{{ cat.name }}</span>
              </td>
              <td class="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                {{ cat.description || '—' }}
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <Package class="h-3.5 w-3.5 text-slate-500" />
                  {{ cat.productsCount }} produto(s)
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    cat.active ? 'text-emerald-600' : 'text-slate-400'
                  ]"
                >
                  <span :class="['h-2 w-2 rounded-full', cat.active ? 'bg-emerald-500' : 'bg-slate-300']"></span>
                  {{ cat.active ? 'Ativa' : 'Inativa' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(cat)"
                    class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                    title="Editar categoria"
                  >
                    <Edit2 class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(cat)"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="Excluir categoria"
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

    <!-- Create / Edit Modal -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 class="text-lg font-bold text-slate-900 mb-4">
          {{ isEditing ? 'Editar Categoria' : 'Nova Categoria' }}
        </h2>

        <div v-if="errorMessage" class="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="saveCategory" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nome da Categoria *</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ex: Bebidas, Mercearia, Laticínios..."
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Descrição</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Informações adicionais sobre o departamento..."
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              v-model="form.active"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option :value="true">Ativa</option>
              <option :value="false">Inativa</option>
            </select>
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
              class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <span>{{ isEditing ? 'Salvar Alterações' : 'Cadastrar Categoria' }}</span>
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
            <h2 class="text-base font-bold text-slate-900">Excluir Categoria</h2>
            <p class="text-xs text-slate-500">Confirmação de exclusão</p>
          </div>
        </div>

        <p class="text-sm text-slate-600 mb-4">
          Deseja realmente excluir a categoria <strong class="text-slate-900 font-semibold">"{{ categoryToDelete?.name }}"</strong>?
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
            <span>Confirmar Exclusão</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
