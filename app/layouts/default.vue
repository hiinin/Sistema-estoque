<script setup lang="ts">
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  CalendarClock,
  Tags,
  Truck,
  Users,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  Store,
  ChevronRight
} from 'lucide-vue-next'

const { user, logout, hasRole } = useAuth()
const route = useRoute()
const isMobileMenuOpen = ref(false)

const navigation = computed(() => {
  const items = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'MANAGER', 'OPERATOR']
    },
    {
      name: 'PDV / Caixa',
      path: '/pos',
      icon: ShoppingCart,
      roles: ['ADMIN', 'MANAGER', 'OPERATOR'],
      highlight: true
    },
    {
      name: 'Produtos',
      path: '/products',
      icon: Package,
      roles: ['ADMIN', 'MANAGER', 'OPERATOR']
    },
    {
      name: 'Estoque & Entradas',
      path: '/stock',
      icon: Boxes,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Lotes & Validade',
      path: '/batches',
      icon: CalendarClock,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Categorias',
      path: '/categories',
      icon: Tags,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Fornecedores',
      path: '/suppliers',
      icon: Truck,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Clientes',
      path: '/customers',
      icon: Users,
      roles: ['ADMIN', 'MANAGER', 'OPERATOR']
    },
    {
      name: 'Relatórios',
      path: '/reports',
      icon: BarChart3,
      roles: ['ADMIN', 'MANAGER']
    },
    {
      name: 'Usuários',
      path: '/users',
      icon: UserCog,
      roles: ['ADMIN']
    }
  ]

  return items.filter((item) => hasRole(item.roles as any))
})

const roleBadgeColor = computed(() => {
  switch (user.value?.role) {
    case 'ADMIN':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'MANAGER':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    default:
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  }
})

const roleLabel = computed(() => {
  switch (user.value?.role) {
    case 'ADMIN':
      return 'Administrador'
    case 'MANAGER':
      return 'Gerente'
    default:
      return 'Operador de Caixa'
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex text-slate-800">
    <!-- Mobile sidebar backdrop -->
    <div
      v-if="isMobileMenuOpen"
      @click="isMobileMenuOpen = false"
      class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 lg:static lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Logo Header -->
      <div class="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        <NuxtLink to="/" class="flex items-center gap-3 font-semibold text-white">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Store class="h-5 w-5" />
          </div>
          <div class="flex flex-col">
            <span class="text-base font-bold tracking-tight text-white leading-none">EstoquePro</span>
            <span class="text-[10px] text-emerald-400 font-medium tracking-wide uppercase mt-0.5">PDV & Gestão</span>
          </div>
        </NuxtLink>

        <button
          @click="isMobileMenuOpen = false"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Navigation links -->
      <nav class="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        <NuxtLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          @click="isMobileMenuOpen = false"
          :class="[
            'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition duration-150',
            route.path === item.path
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
            item.highlight && route.path !== item.path ? 'border border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : ''
          ]"
        >
          <div class="flex items-center gap-3">
            <component
              :is="item.icon"
              :class="[
                'h-5 w-5 shrink-0 transition',
                route.path === item.path ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400',
                item.highlight && route.path !== item.path ? 'text-emerald-400' : ''
              ]"
            />
            <span>{{ item.name }}</span>
          </div>
          <ChevronRight
            :class="[
              'h-4 w-4 transition-transform opacity-0 group-hover:opacity-100',
              route.path === item.path ? 'opacity-100 text-slate-950' : 'text-slate-400'
            ]"
          />
        </NuxtLink>
      </nav>

      <!-- User footer in sidebar -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/50">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-emerald-400 font-bold text-xs uppercase border border-slate-700">
              {{ user?.name ? user.name.slice(0, 2) : 'US' }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold text-white leading-tight">{{ user?.name }}</p>
              <p class="truncate text-[11px] text-slate-400 leading-tight">{{ user?.email }}</p>
            </div>
          </div>
          <button
            @click="logout"
            title="Sair do sistema"
            class="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
      <!-- Top Bar -->
      <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">
        <div class="flex items-center gap-4">
          <button
            @click="isMobileMenuOpen = true"
            class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Menu class="h-5 w-5" />
          </button>

          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-slate-700">Sistema de Estoque</span>
            <span class="text-slate-300">/</span>
            <span class="text-xs font-medium text-slate-500 capitalize">{{ route.name?.toString() || 'Início' }}</span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Fast PDV Button -->
          <NuxtLink
            to="/pos"
            class="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
          >
            <ShoppingCart class="h-3.5 w-3.5" />
            <span>Abrir Caixa PDV</span>
          </NuxtLink>

          <!-- User Role Badge -->
          <div class="flex items-center gap-2">
            <span
              :class="[
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                roleBadgeColor
              ]"
            >
              {{ roleLabel }}
            </span>
          </div>
        </div>
      </header>

      <!-- Main page container -->
      <main class="flex-1 overflow-y-auto p-6 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
