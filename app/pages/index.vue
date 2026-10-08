<script setup lang="ts">
import {
  Boxes,
  ShoppingCart,
  Package,
  CalendarClock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-vue-next'

const { user } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome banner -->
    <div class="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 md:p-8 text-white shadow-lg">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 backdrop-blur-xs mb-3">
            <span class="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
            Sistema Online · Conectado ao Supabase
          </span>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight">
            Olá, {{ user?.name }}! 👋
          </h1>
          <p class="text-emerald-100/90 text-sm mt-1 max-w-xl">
            Bem-vindo ao Sistema de Gestão de Estoque e PDV. Acesse os módulos rápidos abaixo ou utilize a barra lateral.
          </p>
        </div>

        <NuxtLink
          to="/pos"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 shadow-md hover:bg-emerald-50 transition cursor-pointer shrink-0"
        >
          <ShoppingCart class="h-4 w-4 text-emerald-600" />
          <span>Ir para Caixa / PDV</span>
          <ArrowUpRight class="h-4 w-4" />
        </NuxtLink>
      </div>
    </div>

    <!-- Quick stats overview preview -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Produtos</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Package class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-2">9</p>
        <p class="text-xs text-slate-500 mt-1">Itens cadastrados no catálogo</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Estoque Baixo</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-amber-600 mt-2">1</p>
        <p class="text-xs text-slate-500 mt-1">Item abaixo do estoque mínimo</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Validade Próxima</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <CalendarClock class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-orange-600 mt-2">2</p>
        <p class="text-xs text-slate-500 mt-1">Lotes em atenção ou vencidos</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase">Vendas Hoje</span>
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp class="h-5 w-5" />
          </div>
        </div>
        <p class="text-2xl font-bold text-emerald-600 mt-2">R$ 43,80</p>
        <p class="text-xs text-slate-500 mt-1">1 venda registrada no PDV</p>
      </div>
    </div>
  </div>
</template>
