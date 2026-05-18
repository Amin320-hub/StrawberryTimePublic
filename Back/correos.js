import nodemailer from 'nodemailer';
import pool from './conexiondb.js';
import { decrypt } from './crypto.js';

async function getSmtpConfig() {
    const [rows] = await pool.query(
        'SELECT clave, valor FROM Configuracion WHERE clave IN (?, ?, ?, ?, ?)',
        ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'email_destino']
    );
    const cfg = {};
    for (const row of rows) cfg[row.clave] = row.valor;
    return cfg;
}

async function getTransporter() {
    const cfg = await getSmtpConfig();
    if (!cfg.smtp_user || !cfg.smtp_pass) return null;
    return nodemailer.createTransport({
        host: cfg.smtp_host || 'smtp.gmail.com',
        port: parseInt(cfg.smtp_port) || 587,
        secure: false,
        auth: {
            user: cfg.smtp_user,
            pass: decrypt(cfg.smtp_pass),
        },
    });
}

export async function enviarPasswordTemporal(emailDestino, nombre, passwordTemporal) {
    try {
        const cfg = await getSmtpConfig();
        const transporter = await getTransporter();
        if (!transporter) return;

        await transporter.sendMail({
            from: `"Fragola" <${cfg.smtp_user}>`,
            to: emailDestino,
            subject: 'Tus credenciales de acceso — Fragola',
            text: `Hola ${nombre},\n\nTu contraseña temporal es: ${passwordTemporal}\n\nDebes cambiarla en tu primer inicio de sesión.\n\nFragola`,
            html: `
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Tu contraseña temporal de acceso es:</p>
                <p style="font-size:28px;font-family:monospace;letter-spacing:4px;font-weight:bold">${passwordTemporal}</p>
                <p>Debes cambiarla en tu primer inicio de sesión.</p>
                <p style="color:#888;font-size:12px">Fragola — Sistema de fichaje</p>
            `,
        });
    } catch (error) {
        console.error('Error al enviar email:', error.message);
    }
}

export async function enviarCodigoReset(emailDestino, nombre, codigo) {
    try {
        const cfg = await getSmtpConfig();
        const transporter = await getTransporter();
        if (!transporter) return;

        await transporter.sendMail({
            from: `"Fragola" <${cfg.smtp_user}>`,
            to: emailDestino,
            subject: 'Codigo de verificacion — Fragola',
            text: `Hola ${nombre},\n\nTu codigo de verificacion es: ${codigo}\n\nCaduca en 10 minutos.\n\nFragola`,
            html: `
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Tu codigo para cambiar la contrasena es:</p>
                <p style="font-size:36px;font-family:monospace;letter-spacing:8px;font-weight:bold">${codigo}</p>
                <p>Caduca en <strong>10 minutos</strong>.</p>
                <p style="color:#888;font-size:12px">Fragola — Sistema de fichaje</p>
            `,
        });
    } catch (error) {
        console.error('Error al enviar email:', error.message);
    }
}

export async function enviarBackup(contenidoSql) {
    const cfg = await getSmtpConfig();
    const transporter = await getTransporter();
    if (!transporter) throw new Error('SMTP no configurado');
    if (!cfg.email_destino) throw new Error('Email de destino no configurado');

    const fecha = new Date().toISOString().slice(0, 10);
    await transporter.sendMail({
        from: `"Fragola" <${cfg.smtp_user}>`,
        to: cfg.email_destino,
        subject: `Copia de seguridad Fragola — ${fecha}`,
        text: 'Adjunto encontrará la copia de seguridad de la base de datos.',
        attachments: [{
            filename: `backup_${fecha}.sql`,
            content: contenidoSql,
            contentType: 'text/plain',
        }],
    });
}
