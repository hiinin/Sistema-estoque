export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth()

  // Se ainda não carregou o usuário no SSR ou no cliente, tenta buscar
  if (user.value === null) {
    try {
      const headers = useRequestHeaders(['cookie'])
      const data = await $fetch<{ user: any }>('/api/auth/me', { headers }).catch(() => null)
      if (data?.user) {
        user.value = data.user
      }
    } catch {
      user.value = null
    }
  }

  const isLoginPage = to.path === '/login'

  // 1. Se não está logado e tenta acessar página protegida
  if (!user.value && !isLoginPage) {
    return navigateTo('/login')
  }

  // 2. Se já está logado e tenta acessar login
  if (user.value && isLoginPage) {
    return navigateTo('/')
  }

  // 3. Verificação de permissões por rota
  const requiredRoles = to.meta.roles as string[] | undefined
  if (user.value && requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.value.role)) {
      return navigateTo('/')
    }
  }
})
