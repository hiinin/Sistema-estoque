import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  },
  runtimeConfig: {
    databaseUrl: '',
    sessionSecret: ''
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Sistema de Estoque',
      meta: [
        { name: 'description', content: 'Gestão de estoque, vendas (PDV), validade e dashboard.' }
      ]
    }
  },
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : undefined,
    noExternals: true
  }
})
