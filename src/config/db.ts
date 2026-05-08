import mysql from 'mysql2/promise';
import { config } from './env'

export const pool = mysql.createPool({
  host                 : config.DB_HOST || 'localhost',
  user                 : config.DB_USER || 'redseadb',
  password             : config.DB_PASSWORD || '',
  database             : config.DB_SCHEMA || 'cami-vime',
  port                 : parseInt(config.DB_PORT || '3306', 10),
  waitForConnections   : true,
  connectionLimit      : 10,
  queueLimit           : 0,
  enableKeepAlive      : true,
  keepAliveInitialDelay: 0,
})

export const initializeDb = async () => {
  try {
    await pool.query('select now()')
    console.log('Database connected succesfully')
  } catch( err ) {
    console.error('Database connection error: ', err)
  }
}