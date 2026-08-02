import dotenv from 'dotenv'

dotenv.config()

const parsePort = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const required = (name: string): string => {
    const value = process.env[name]?.trim()
    if (!value) throw new Error(`Missing required environment variable: ${name}`)
    return value
}

export const config = {
    PORT: parsePort(process.env.PORT, 3000),
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',
    HOST: process.env.HOST || '0.0.0.0',
    DB_HOST: required('DB_HOST'),
    DB_PORT: parsePort(process.env.DB_PORT, 3306),
    DB_USER: required('DB_USER'),
    DB_PASSWORD: required('DB_PASSWORD'),
    DB_GLOBAL_SCHEMA: required('DB_GLOBAL_SCHEMA'),
    SECRET_JWT_TOKEN: process.env.SECRET_JWT_TOKEN || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
    GCS_CLINICAL_BUCKET: process.env.GCS_CLINICAL_BUCKET || 'nubsmart-medit-clinical',
    GCS_PUBLIC_BUCKET: process.env.GCS_PUBLIC_BUCKET || 'nubsmart-medit-public',
    // Optional service-account key file; on GCP the default credentials are used.
    GCS_KEY_FILE: process.env.GCS_KEY_FILE || '',
}
