<script setup lang="ts">
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Phone,
  Mail,
  FileText,
  UserCheck,
  ShoppingCart
} from 'lucide-vue-next'

interface Customer {
  id: number
  name: string
  cpf: string | null
  phone: string | null
  email: string | null
  createdAt: string
  updatedAt: string
}

const search = ref('')
const { data, refresh, pending } = await useFetch<{ customers: Customer[] }>('/api/customers', {
  query: computed(() => ({ search: search.value }))
})

const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')

const form = ref({
  name: '',
  cpf: '',
  phone: '',
  email: ''
})

const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  errorMessage.value = ''
  form.value = {
    name: '',
    cpf: '',
    phone: '',
    email: ''
  }
  isModalOpen.value = true
}

const openEditModal = (cust: Customer) => {
  isEditing.value = true
  editingId.value = cust.id
  errorMessage.value = ''
  form.value = {
    name: cust.name,
    cpf: cust.cpf || '',
    phone: cust.phone || '',
    email: cust.email || ''
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const saveCustomer = async () => {
  errorMessage.value = ''
  isSaving.value = true
  try {
    if (isEditing.value && editingId.value) {
      await $fetch(`/api/customers/${editingId.value}`, {
        method: 'PUT',
        body: form.value
      })
    } else {
      await $fetch('/api/customers', {
        method: 'POST',
        body: form.value
      })
    }
    closeModal()
    await refresh()
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'Erro ao salvar cliente.'
  } finally {
    isSaving.value = false
  }
}

const deleteCustomer = async (cust: Customer) => {
  if (!confirm(`Deseja realmente excluir o cliente "${cust.name}"?`)) return
  try {
    await $fetch(`/api/customers/${cust.id}`, { method: 'DELETE' })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'Erro ao excluir cliente.')
  }
}

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Users class="h-7 w-7 text-emerald-600" />
          Clientes Cadastrados
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Gerencie o cadastro de clientes para identificação de vendas e histórico de compras no PDV.
        </p>
      </div>

      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        <span>Novo Cliente</span>
      </button>
    </div>

    <!-- Barra de Busca -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div class="relative max-w-md">
        <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          v-model="search"
          placeholder="Buscar por nome, CPF, telefone ou e-mail..."
          class="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>

    <!-- Tabela de Clientes -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">CPF</th>
              <th class="px-4 py-3">Telefone</th>
              <th class="px-4 py-3">E-mail</th>
              <th class="px-4 py-3">Data Cadastro</th>
              <th class="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="cust in data?.customers" :key="cust.id" class="hover:bg-slate-50/70 transition">
              <td class="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                <div class="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  {{ cust.name.charAt(0).toUpperCase() }}
                </div>
                <span>{{ cust.name }}</span>
              </td>
              <td class="px-4 py-3 font-mono text-xs">{{ cust.cpf || '-' }}</td>
              <td class="px-4 py-3 text-xs">{{ cust.phone || '-' }}</td>
              <td class="px-4 py-3 text-xs">{{ cust.email || '-' }}</td>
              <td class="px-4 py-3 text-xs text-slate-400">{{ formatDateTime(cust.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(cust)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    title="Editar"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    @click="deleteCustomer(cust)"
                    class="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!data?.customers?.length">
              <td colspan="6" class="text-center py-10 text-slate-400">
                Nenhum cliente encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Cadastro / Edição -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 class="text-lg font-bold text-slate-900">
            {{ isEditing ? 'Editar Cliente' : 'Novo Cliente' }}
          </h2>
          <button @click="closeModal" class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveCustomer" class="space-y-3">
          <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium">
            {{ errorMessage }}
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nome Completo *</label>
            <input
              type="text"
              v-model="form.name"
              required
              placeholder="Ex: Maria Silva Santos"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">CPF</label>
            <input
              type="text"
              v-model="form.cpf"
              placeholder="000.000.000-00"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Telefone / WhatsApp</label>
            <input
              type="text"
              v-model="form.phone"
              placeholder="(11) 99999-9999"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
            <input
              type="email"
              v-model="form.email"
              placeholder="cliente@exemplo.com"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSaving"
              class="px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
            >
              {{ isSaving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
