import { PoolManager } from '../infrastructure/database/PoolManager'

export const initializeDb = async () => {
  try {
    PoolManager.init()
    await PoolManager.globalPool().query('SELECT NOW()')
    console.log('Database connected successfully')
  } catch (err) {
    console.error('Database connection error:', err)
    process.exit(1)
  }
}