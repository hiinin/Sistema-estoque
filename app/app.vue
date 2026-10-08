<script setup lang="ts">
const { data, error, status } = await useFetch<{ status: string; database: string }>('/api/health')
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6">
    <h1 class="text-3xl font-bold text-brand-700">Sistema de Estoque</h1>
    <p class="text-gray-600">Estoque, PDV, validade e dashboard.</p>
    <div class="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p v-if="status === 'pending'" class="text-gray-500">Verificando banco de dados...</p>
      <p v-else-if="error" class="text-red-600">Banco de dados indisponível.</p>
      <p v-else class="text-brand-700">
        API online · banco: {{ data?.database }}
      </p>
    </div>
  </main>
</template>
