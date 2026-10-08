import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:8uZNPz2jBdUOYkixS93sbe5l@db.jasxeuyqlfuwgajbsnyh.supabase.co:5432/postgres'
  }
})
