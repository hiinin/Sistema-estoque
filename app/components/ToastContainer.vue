<script setup lang="ts">
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-vue-next'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="fixed top-5 right-5 z-100 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0">
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all',
          toast.type === 'success' ? 'bg-white/95 text-slate-800 border-emerald-500/30 shadow-emerald-500/10' :
          toast.type === 'error' ? 'bg-white/95 text-slate-800 border-rose-500/30 shadow-rose-500/10' :
          toast.type === 'warning' ? 'bg-white/95 text-slate-800 border-amber-500/30 shadow-amber-500/10' :
          'bg-white/95 text-slate-800 border-blue-500/30 shadow-blue-500/10'
        ]"
      >
        <!-- Icon -->
        <div
          :class="[
            'p-1.5 rounded-xl shrink-0 mt-0.5',
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
            toast.type === 'warning' ? 'bg-amber-50 text-amber-600' :
            'bg-blue-50 text-blue-600'
          ]"
        >
          <CheckCircle2 v-if="toast.type === 'success'" class="h-5 w-5" />
          <AlertCircle v-else-if="toast.type === 'error'" class="h-5 w-5" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="h-5 w-5" />
          <Info v-else class="h-5 w-5" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pr-1">
          <h4
            v-if="toast.title"
            :class="[
              'text-xs font-bold leading-tight mb-0.5',
              toast.type === 'success' ? 'text-emerald-900' :
              toast.type === 'error' ? 'text-rose-900' :
              toast.type === 'warning' ? 'text-amber-900' :
              'text-blue-900'
            ]"
          >
            {{ toast.title }}
          </h4>
          <p class="text-xs text-slate-600 leading-relaxed break-words font-medium">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close button -->
        <button
          @click="remove(toast.id)"
          class="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
