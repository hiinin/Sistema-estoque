<script setup lang="ts">
import {
  Boxes,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  ShoppingCart,
  AlertCircle,
  Loader2
} from 'lucide-vue-next'

definePageMeta({
  layout: 'auth'
})

const { login } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Preencha o e-mail e a senha.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    await login(email.value, password.value)
    router.push('/')
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Falha ao autenticar. Verifique suas credenciais.'
  } finally {
    isLoading.value = false
  }
}

const fillDemo = (userEmail: string, pass: string) => {
  email.value = userEmail
  password.value = pass
  handleLogin()
}
</script>

<template>
  <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
    <!-- Brand Header -->
    <div class="flex flex-col items-center text-center mb-8">
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
        <Boxes class="h-7 w-7" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white">Sistema de Estoque</h1>
      <p class="text-sm text-slate-400 mt-1">Gestão inteligente, PDV e controle de validade</p>
    </div>

    <!-- Error alert -->
    <div
      v-if="errorMessage"
      class="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-400 animate-in fade-in duration-200"
    >
      <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
      <div class="flex-1 leading-relaxed">{{ errorMessage }}</div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="block text-xs font-medium text-slate-300 mb-1.5">E-mail</label>
        <div class="relative">
          <Mail class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            v-model="email"
            type="email"
            required
            placeholder="seu.email@empresa.com"
            class="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
        <div class="relative">
          <Lock class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition duration-150 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Loader2 v-if="isLoading" class="h-4 w-4 animate-spin" />
        <span v-else>Entrar no Sistema</span>
        <ArrowRight v-if="!isLoading" class="h-4 w-4" />
      </button>
    </form>

    <!-- 1-Click Demo Profiles -->
    <div class="mt-8 pt-6 border-t border-slate-800">
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
        Acesso rápido para demonstração
      </p>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          @click="fillDemo('admin@estoque.com', 'admin123')"
          class="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition text-left cursor-pointer group"
        >
          <ShieldCheck class="h-4 w-4 text-emerald-400 mb-1 group-hover:scale-110 transition" />
          <span class="text-xs font-medium text-slate-200">Admin</span>
          <span class="text-[10px] text-slate-500">Acesso Total</span>
        </button>

        <button
          type="button"
          @click="fillDemo('gerente@estoque.com', 'gerente123')"
          class="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-blue-500/40 hover:bg-blue-500/5 transition text-left cursor-pointer group"
        >
          <UserCheck class="h-4 w-4 text-blue-400 mb-1 group-hover:scale-110 transition" />
          <span class="text-xs font-medium text-slate-200">Gerente</span>
          <span class="text-[10px] text-slate-500">Gestão</span>
        </button>

        <button
          type="button"
          @click="fillDemo('operador@estoque.com', 'operador123')"
          class="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-amber-500/40 hover:bg-amber-500/5 transition text-left cursor-pointer group"
        >
          <ShoppingCart class="h-4 w-4 text-amber-400 mb-1 group-hover:scale-110 transition" />
          <span class="text-xs font-medium text-slate-200">Operador</span>
          <span class="text-[10px] text-slate-500">PDV / Caixa</span>
        </button>
      </div>
    </div>
  </div>
</template>
