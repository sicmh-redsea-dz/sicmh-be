export interface PasswordResetMail {
  name: string
  email: string
  resetUrl: string
}

export interface MailService {
  sendPasswordReset(payload: PasswordResetMail): Promise<void>
}
