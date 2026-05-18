import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export function encrypt(text) {
    if (!text) return '';
    // Vector de cifrado en base 16
    const iv = randomBytes(16);
    //Objeto ciftado
    const cipher = createCipheriv('aes-256-cbc', KEY, iv);
    //cirfrado
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    const [ivHex, encHex] = text.split(':');
    const iv  = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ── QR Token (cambia cada 10 minutos) ──────────────────────────────────────

function qrWindow(offset = 0) {
    return Math.floor(Date.now() / (10 * 60 * 1000)) + offset;
}

export function getQrToken() {
    return createHmac('sha256', process.env.QR_SECRET)
        .update(String(qrWindow()))
        .digest('hex')
        .slice(0, 12);
}

export function validateQrToken(token) {
    // Acepta la ventana actual y la anterior (margen de hasta 10 min)
    for (const offset of [0, -1]) {
        const expected = createHmac('sha256', process.env.QR_SECRET)
            .update(String(qrWindow(offset)))
            .digest('hex')
            .slice(0, 12);
        if (token === expected) return true;
    }
    return false;
}
