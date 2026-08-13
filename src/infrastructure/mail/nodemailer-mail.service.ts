import nodemailer, { Transporter } from 'nodemailer'
import { MailService, PasswordResetMail } from '../../application/ports/mail.service'
import { config } from '../../config/env'

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

export class NodemailerMailService implements MailService {
  private transporter?: Transporter

  async sendPasswordReset(payload: PasswordResetMail): Promise<void> {
    const transporter = this.getTransporter()
    const name = escapeHtml(payload.name)
    const resetUrl = escapeHtml(payload.resetUrl)

    await transporter.sendMail({
      from: config.SMTP_FROM,
      to: payload.email,
      subject: 'Restablece tu contraseña de MedIT',
      text: `Hola ${payload.name}. Usa este enlace para restablecer tu contraseña: ${payload.resetUrl}. El enlace vence en 30 minutos.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:auto">
          <h2 style="color:#1f2a44">Restablecimiento de contraseña</h2>
          <p>Hola ${name},</p>
          <p>Recibimos una solicitud para cambiar tu contraseña de MedIT.</p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="background:#14b8a6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
              Crear nueva contraseña
            </a>
          </p>
          <p>Este enlace vence en 30 minutos y solo puede utilizarse una vez.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    })
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
      throw new Error('SMTP is not configured.')
    }

    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    })
    return this.transporter
  }
}
