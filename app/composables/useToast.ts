export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const toasts = ref<ToastMessage[]>([])

export function useToast() {
  const show = (options: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: ToastMessage = {
      id,
      duration: options.duration ?? 4000,
      ...options
    }

    toasts.value.push(toast)

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        remove(id)
      }, toast.duration)
    }

    return id
  }

  const success = (message: string, title: string = 'Sucesso!') => {
    return show({ type: 'success', message, title })
  }

  const error = (message: string, title: string = 'Erro!') => {
    return show({ type: 'error', message, title, duration: 5500 })
  }

  const warning = (message: string, title: string = 'Atenção!') => {
    return show({ type: 'warning', message, title })
  }

  const info = (message: string, title: string = 'Informação') => {
    return show({ type: 'info', message, title })
  }

  const remove = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clear = () => {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear
  }
}
