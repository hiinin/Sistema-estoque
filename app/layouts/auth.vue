<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
    <!-- Background glow effects -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
    
    <div class="w-full max-w-md relative z-10">
      <slot />
    </div>

    <footer class="mt-8 text-center text-xs text-slate-500 relative z-10">
      Sistema de Gestão de Estoque &copy; {{ new Date().getFullYear() }} · Alta Confiabilidade
    </footer>
  </div>
</template>
