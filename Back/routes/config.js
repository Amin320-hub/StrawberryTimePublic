import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../conexiondb.js';
import { encrypt, decrypt } from '../crypto.js';
import { enviarBackup, enviarCodigoReset } from '../correos.js';

const resetCodes = new Map();

const router = express.Router();

// GET /config
// Devuelve la configuración actual (smtp_pass descifrado para que el admin la vea)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT clave, valor FROM Configuracion');
        const config = {};
        for (const row of rows) {
            config[row.clave] = row.clave === 'smtp_pass' && row.valor
                ? decrypt(row.valor)
                : row.valor;
        }
        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// PUT /config
// Actualiza uno o varios valores de configuración
router.put('/', async (req, res) => {
    try {
        const permitidas = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'email_destino', 'server_url'];

        for (const [clave, valor] of Object.entries(req.body)) {
            if (!permitidas.includes(clave)) continue;
            const valorGuardar = clave === 'smtp_pass' && valor ? encrypt(valor) : valor;
            await pool.query(
                'INSERT INTO Configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
                [clave, valorGuardar, valorGuardar]
            );
        }

        res.json({ message: 'Configuración guardada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// POST /config/backup — genera copia de seguridad y la envía por email
router.post('/backup', async (req, res) => {
    try {
        const tablas = ['Admin', 'Usuario', 'Dispositivo', 'Jornada', 'Usuario_Jornada', 'Intervalo_Jornada', 'Incidencia'];
        const fecha = new Date().toISOString();
        let sql = `-- Fragola backup generado el ${fecha}\n\n`;

        for (const tabla of tablas) {
            const [rows] = await pool.query(`SELECT * FROM \`${tabla}\``);
            if (rows.length === 0) continue;
            const cols = Object.keys(rows[0]);
            sql += `-- Tabla: ${tabla}\n`;
            for (const row of rows) {
                const vals = cols.map(c =>
                    row[c] === null ? 'NULL' : `'${String(row[c]).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
                );
                sql += `INSERT INTO \`${tabla}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${vals.join(', ')});\n`;
            }
            sql += '\n';
        }

        await enviarBackup(sql);
        res.json({ message: 'Copia de seguridad enviada correctamente' });
    } catch (error) {
        console.error('Error en backup:', error);
        res.status(500).json({ message: error.message || 'Error al generar la copia de seguridad' });
    }
});

// POST /config/admin-codigo
// Genera un codigo de 6 digitos y lo envia al email del admin logueado
router.post('/admin-codigo', async (req, res) => {
    try {
        const adminId = req.usuario.id;
        const [rows] = await pool.query('SELECT email, nombre FROM Admin WHERE id = ?', [adminId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Admin no encontrado' });

        const { email, nombre } = rows[0];
        if (!email) return res.status(400).json({ error: 'No tienes email registrado' });

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        resetCodes.set(adminId, { codigo, expiry: Date.now() + 10 * 60 * 1000 });

        await enviarCodigoReset(email, nombre, codigo);
        res.json({ message: 'Codigo enviado al email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /config/admin-verificar-codigo
// Verifica el codigo y cambia la contrasena
router.post('/admin-verificar-codigo', async (req, res) => {
    try {
        const adminId = req.usuario.id;
        const { codigo, password_nueva } = req.body;

        if (!codigo || !password_nueva) return res.status(400).json({ error: 'Faltan campos' });
        if (password_nueva.length < 6) return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });

        const entry = resetCodes.get(adminId);
        if (!entry) return res.status(400).json({ error: 'No hay codigo pendiente, solicita uno nuevo' });
        if (Date.now() > entry.expiry) {
            resetCodes.delete(adminId);
            return res.status(400).json({ error: 'El codigo ha expirado, solicita uno nuevo' });
        }
        if (entry.codigo !== codigo) return res.status(400).json({ error: 'Codigo incorrecto' });

        resetCodes.delete(adminId);
        const hash = await bcrypt.hash(password_nueva, 10);
        await pool.query('UPDATE Admin SET password_hash = ? WHERE id = ?', [hash, adminId]);
        res.json({ message: 'Contrasena cambiada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /config/nuevo-admin
// Crea un nuevo administrador
router.post('/nuevo-admin', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        if (password.length < 6) return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });

        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO Admin (nombre, email, password_hash, cambiar_password) VALUES (?, ?, ?, 0)',
            [nombre, email, hash]
        );
        res.status(201).json({ message: 'Administrador creado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un administrador con ese email' });
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;
