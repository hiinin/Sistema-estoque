export interface UserProfile {
  id: number
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR'
}

export function useAuth() {
  const user = useState<UserProfile | null>('auth_user', () => null)
  const loading = useState<boolean>('auth_loading', () => false)
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)

  const hasRole = (allowedRoles: ('ADMIN' | 'MANAGER' | 'OPERATOR')[]) => {
    if (!user.value) return false
    return allowedRoles.includes(user.value.role)
  }

  const fetchUser = async () => {
    try {
      loading.value = true
      const { data } = await useFetch<{ user: UserProfile }>('/api/auth/me')
      if (data.value?.user) {
        user.value = data.value.user
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  const login = async (email: string, password: string) => {
    const res = await $fetch<{ message: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = res.user
    return res
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      user.value = null
      router.push('/login')
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    role,
    hasRole,
    fetchUser,
    login,
    logout
  }
}
