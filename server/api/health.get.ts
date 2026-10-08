import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    const db = await useDb()
    await db.execute(sql`select 1`)
    return { status: 'ok', database: databaseDriver() }
  } catch (error) {
    console.error('Health check falhou:', error)
    setResponseStatus(event, 503)
    return {
      message: 'Não foi possível conectar ao banco de dados.',
      errors: { database: ['Verifique a variável DATABASE_URL.'] }
    }
  }
})
