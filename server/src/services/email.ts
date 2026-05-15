import nodemailer from 'nodemailer'
import { getDb } from '../db.js'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

function getSmtpConfig(): SmtpConfig | null {
  const db = getDb()
  const host = (db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_host'").get() as any)?.value
  if (!host) return null
  return {
    host,
    port: parseInt((db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_port'").get() as any)?.value || '587'),
    user: (db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_user'").get() as any)?.value || '',
    pass: (db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_pass'").get() as any)?.value || '',
    from: (db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_from'").get() as any)?.value || '',
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const config = getSmtpConfig()
  if (!config) return { success: false, error: 'SMTP not configured' }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject: 'QuickMovie 邮件配置测试',
      text: '恭喜！您的 QuickMovie 邮件服务配置成功。',
    })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
