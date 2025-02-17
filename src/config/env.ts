import dotenv from 'dotenv'

dotenv.config()

export const config = {
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_SCHEMA: process.env.DB_SCHEMA,
    SECRET_JWT_TOKEN: process.env.SECRET_JWT_TOKEN || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
}