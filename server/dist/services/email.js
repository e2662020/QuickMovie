import nodemailer from 'nodemailer';
import { getDb } from '../db.js';
function getSmtpConfig() {
    const db = getDb();
    const host = db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_host'").get()?.value;
    if (!host)
        return null;
    return {
        host,
        port: parseInt(db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_port'").get()?.value || '587'),
        user: db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_user'").get()?.value || '',
        pass: db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_pass'").get()?.value || '',
        from: db.prepare("SELECT value FROM settings WHERE key = 'email_smtp_from'").get()?.value || '',
    };
}
export async function sendTestEmail(to) {
    const config = getSmtpConfig();
    if (!config)
        return { success: false, error: 'SMTP not configured' };
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
    });
    try {
        await transporter.sendMail({
            from: config.from,
            to,
            subject: 'QuickMovie 邮件配置测试',
            text: '恭喜！您的 QuickMovie 邮件服务配置成功。',
        });
        return { success: true };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
