<script setup lang="ts">
import {
  UserCog,
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-vue-next'

definePageMeta({
  roles: ['ADMIN']
})

interface UserItem {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR'
  active: boolean
  createdAt: string
}

const { data: usersData, refresh, pending } = await useFetch<{ users: UserItem[] }>('/api/users')
const usersList = computed(() => usersData.value?.users || [])

// Modal state
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  id: 0,
  name: '',
  email: '',
  password: '',
  role: 'OPERATOR' as 'ADMIN' | 'MANAGER' | 'OPERATOR',
  active: true
})

const openCreateModal = () => {
  isEditing.value = false
  errorMessage.value = ''
  form.value = {
    id: 0,
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    active: true
  }
  isModalOpen.value = true
}

const openEditModal = (u: UserItem) => {
  isEditing.value = true
  errorMessage.value = ''
  form.value = {
    id: u.id,
    name: u.name,
    email: u.email,
    password: '',
    role: u.role,
    active: u.active
  }
  isModalOpen.value = true
}

const saveUser = async () => {
  isSaving.value = true
  errorMessage.value = ''
  try {
    if (isEditing.value) {
      await $fetch(`/api/users/${form.value.id}`, {
        method: 'PUT',
        body: form.value
      })
      successMessage.value = 'Usuário atualizado com sucesso!'
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: form.value
      })
      successMessage.value = 'Usuário cadastrado com sucesso!'
    }
    isModalOpen.value = false
    await refresh()
    setTimeout(() => { successMessage.value = '' }, 3000)
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Erro ao salvar usuário'
  } finally {
    isSaving.value = false
  }
}

const toggleUserStatus = async (u: UserItem) => {
  if (!confirm(`Deseja realmente ${u.active ? 'desativar' : 'ativar'} o usuário "${u.name}"?`)) return
  try {
    await $fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      body: {
        name: u.name,
        email: u.email,
        role: u.role,
        active: !u.active
      }
    })
    await refresh()
  } catch (err: any) {
    alert(err.data?.message || 'Erro ao alterar status do usuário')
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <UserCog class="h-7 w-7 text-emerald-600" />
          Gerenciamento de Usuários
        </h1>
        <p class="text-sm text-slate-500 mt-1">Controle de operadores, gerentes e administradores do sistema</p>
      </div>

      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        Novo Usuário
      </button>
    </div>

    <!-- Success notification -->
    <div
      v-if="successMessage"
      class="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 animate-in fade-in"
    >
      <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Users Table Card -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div v-if="pending" class="flex justify-center items-center py-16">
        <Loader2 class="h-8 w-8 animate-spin text-emerald-600" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th class="px-6 py-3.5">Nome / E-mail</th>
              <th class="px-6 py-3.5">Perfil</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5">Criado em</th>
              <th class="px-6 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="u in usersList" :key="u.id" class="hover:bg-slate-50/80 transition">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{{ u.name }}</div>
                <div class="text-xs text-slate-500">{{ u.email }}</div>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
                    u.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    u.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  ]"
                >
                  <Shield class="h-3 w-3" />
                  {{ u.role === 'ADMIN' ? 'Administrador' : u.role === 'MANAGER' ? 'Gerente' : 'Operador' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    u.active ? 'text-emerald-600' : 'text-slate-400'
                  ]"
                >
                  <span :class="['h-2 w-2 rounded-full', u.active ? 'bg-emerald-500' : 'bg-slate-300']"></span>
                  {{ u.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-6 py-4 text-xs text-slate-500">
                {{ new Date(u.createdAt).toLocaleDateString('pt-BR') }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(u)"
                    class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                    title="Editar usuário"
                  >
                    <Edit2 class="h-4 w-4" />
                  </button>
                  <button
                    @click="toggleUserStatus(u)"
                    :class="[
                      'rounded-lg p-1.5 transition cursor-pointer',
                      u.active ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                    ]"
                    :title="u.active ? 'Desativar usuário' : 'Ativar usuário'"
                  >
                    <XCircle v-if="u.active" class="h-4 w-4" />
                    <CheckCircle2 v-else class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
        <h2 class="text-lg font-bold text-slate-900 mb-4">
          {{ isEditing ? 'Editar Usuário' : 'Novo Usuário' }}
        </h2>

        <div v-if="errorMessage" class="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="saveUser" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Ex: Carlos Silva"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="carlos@empresa.com"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Senha {{ isEditing ? '(deixe em branco para manter a atual)' : '' }}
            </label>
            <input
              v-model="form.password"
              type="password"
              :required="!isEditing"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Perfil de Acesso</label>
              <select
                v-model="form.role"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ADMIN">Administrador (Total)</option>
                <option value="MANAGER">Gerente (Gestão)</option>
                <option value="OPERATOR">Operador (PDV/Vendas)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                v-model="form.active"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option :value="true">Ativo</option>
                <option :value="false">Inativo</option>
              </select>
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
              class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition disabled:opacity-50 cursor-pointer"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 animate-spin" />
              <span>{{ isEditing ? 'Salvar Alterações' : 'Criar Usuário' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
