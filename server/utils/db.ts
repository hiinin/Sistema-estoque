import { mkdirSync } from 'node:fs'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

type Db = ReturnType<typeof drizzlePg>

/**
 * Com DATABASE_URL definida (Supabase/PostgreSQL) usa o servidor remoto.
 * Sem ela, usa PGlite (PostgreSQL embutido) persistido em .data/pglite,
 * o que permite rodar o projeto localmente sem instalar nada.
 *
 * O PGlite é carregado por import dinâmico (nome em variável) para que o
 * bundler não o embuta: ele depende de arquivos WASM do node_modules.
 */
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    return drizzlePg(postgres(url, { prepare: false, max: 5 }))
  }

  mkdirSync('./.data', { recursive: true })
  const pgliteModule = '@electric-sql/pglite'
  const drizzleModule = 'drizzle-orm/pglite'
  const { PGlite } = await import(/* @vite-ignore */ pgliteModule)
  const { drizzle } = await import(/* @vite-ignore */ drizzleModule)
  return drizzle(new PGlite('./.data/pglite')) as unknown as Db
}

let instance: Promise<Db> | undefined

export function useDb(): Promise<Db> {
  return (instance ??= createDb())
}

export function databaseDriver(): 'postgres' | 'pglite' {
  return process.env.DATABASE_URL ? 'postgres' : 'pglite'
}
