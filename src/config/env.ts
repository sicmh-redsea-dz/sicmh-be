import dotenv from 'dotenv'

dotenv.config()

const parsePort = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
    PORT: parsePort(process.env.PORT, 3000),
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || '',
    HOST: process.env.HOST || '0.0.0.0',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_SCHEMA: process.env.DB_SCHEMA,
    SECRET_JWT_TOKEN: process.env.SECRET_JWT_TOKEN || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parsePort(process.env.SMTP_PORT, 465),
    SMTP_SECURE: (process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || '',
    GCS_CLINICAL_BUCKET: process.env.GCS_CLINICAL_BUCKET || 'nubsmart-medit-clinical',
    GCS_PUBLIC_BUCKET: process.env.GCS_PUBLIC_BUCKET || 'nubsmart-medit-public',
    // Optional service-account key file; on GCP the default credentials are used.
    GCS_KEY_FILE: process.env.GCS_KEY_FILE || '',
}
