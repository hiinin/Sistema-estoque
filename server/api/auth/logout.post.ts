import { clearUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  clearUserSession(event)
  return {
    message: 'Logout realizado com sucesso'
  }
})
