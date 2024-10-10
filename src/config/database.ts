import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host      : process.env.DB_HOST || 'localhost',
  user      : process.env.DB_USER || 'redseadb' ,
  password  : process.env.DB_PASSWORD || '',
  database  : process.env.DB_SCHEMA || 'cami-vime',
  port      : parseInt(process.env.DB_PORT || '3306', 10)
})