
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import pool from '../conexiondb.js';
import { encrypt, getQrToken } from '../crypto.js';
import { enviarPasswordTemporal } from '../correos.js';

const router = express.Router();

// POST /sesion/login
router.post('/login', async (req, res) => {
    try {
        const { dni, password } = req.body;

        if (!dni || !password) {
            return res.status(400).json({ message: 'DNI y contraseña obligatorios' });
        }

        const [rows] = await pool.query(
            'SELECT dni, nombre_completo, password_hash, cambiar_password FROM Usuario WHERE dni = ? AND activo = 1',
            [dni]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const coincide = await bcrypt.compare(password, rows[0].password_hash);

        if (!coincide) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const token = jwt.sign(
            { dni: rows[0].dni, nombre: rows[0].nombre_completo, rol: 'empleado' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            nombre: rows[0].nombre_completo,
            cambiar_password: rows[0].cambiar_password === 1
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// POST /sesion/registro
// El admin crea un empleado — la contraseña temporal se genera automáticamente
router.post('/registro', async (req, res) => {
    try {
        const { dni, nombre_completo, puesto, email } = req.body;

        if (!dni || !nombre_completo) {
            return res.status(400).json({ message: 'DNI y nombre obligatorios' });
        }

        const passwordTemporal = randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(passwordTemporal, 10);

        await pool.query(
            'INSERT INTO Usuario (dni, nombre_completo, puesto, email, password_hash, cambiar_password) VALUES (?, ?, ?, ?, ?, 1)',
            [dni, nombre_completo, puesto || null, email || null, hash]
        );

        if (email) {
            enviarPasswordTemporal(email, nombre_completo, passwordTemporal);
        }

        res.status(201).json({
            message: 'Empleado creado correctamente',
            password_temporal: passwordTemporal
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe un empleado con ese DNI' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// PUT /sesion/cambiar-password
// El empleado cambia su contraseña (obligatorio en el primer login)
router.put('/cambiar-password', async (req, res) => {
    try {
        const { dni, password_actual, password_nueva } = req.body;

        if (!dni || !password_actual || !password_nueva) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const [rows] = await pool.query(
            'SELECT password_hash FROM Usuario WHERE dni = ? AND activo = 1',
            [dni]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        const coincide = await bcrypt.compare(password_actual, rows[0].password_hash);

        if (!coincide) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        const nuevoHash = await bcrypt.hash(password_nueva, 10);

        await pool.query(
            'UPDATE Usuario SET password_hash = ?, cambiar_password = 0 WHERE dni = ?',
            [nuevoHash, dni]
        );

        res.json({ message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// POST /sesion/login-admin
router.post('/login-admin', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña obligatorios' });
        }

        const [rows] = await pool.query(
            'SELECT id, nombre, email, password_hash, cambiar_password FROM Admin WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const coincide = await bcrypt.compare(password, rows[0].password_hash);

        if (!coincide) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const rol = 'admin';

        const token = jwt.sign(
            { id: rows[0].id, nombre: rows[0].nombre, rol },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            id: rows[0].id,
            nombre: rows[0].nombre,
            rol,
            cambiar_password: rows[0].cambiar_password === 1
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// PUT /sesion/cambiar-password-admin
router.put('/cambiar-password-admin', async (req, res) => {
    try {
        const { id, password_actual, password_nueva } = req.body;

        if (!id || !password_actual || !password_nueva) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const [rows] = await pool.query(
            'SELECT password_hash FROM Admin WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Admin no encontrado' });
        }

        const coincide = await bcrypt.compare(password_actual, rows[0].password_hash);

        if (!coincide) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        const nuevoHash = await bcrypt.hash(password_nueva, 10);

        await pool.query(
            'UPDATE Admin SET password_hash = ?, cambiar_password = 0 WHERE id = ?',
            [nuevoHash, id]
        );

        res.json({ message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// GET /sesion/setup-needed
// Comprueba si existe algún admin — si no, hay que hacer el setup inicial
router.get('/setup-needed', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM Admin');
        res.json({ setup: rows[0].total === 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// POST /sesion/setup
// Crea el primer administrador y guarda las credenciales SMTP
// Solo funciona si la tabla Admin está vacía
router.post('/setup', async (req, res) => {
    try {
        const { nombre, email, password, smtp_host, smtp_port, smtp_user, smtp_pass, email_destino, server_url } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ message: 'Nombre, email y contraseña obligatorios' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const [rows] = await pool.query('SELECT COUNT(*) as total FROM Admin');
        if (rows[0].total > 0) {
            return res.status(403).json({ message: 'El sistema ya está configurado' });
        }

        const hash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO Admin (nombre, email, password_hash, cambiar_password) VALUES (?, ?, ?, 0)',
            [nombre, email, hash]
        );

        // Guardar credenciales SMTP — smtp_pass cifrado con AES-256
        const smtpValues = {
            smtp_host:     smtp_host     || '',
            smtp_port:     smtp_port     || '587',
            smtp_user:     smtp_user     || '',
            smtp_pass:     smtp_pass     ? encrypt(smtp_pass) : '',
            email_destino: email_destino || '',
            server_url:    server_url    || '',
        };

        for (const [clave, valor] of Object.entries(smtpValues)) {
            await pool.query(
                'UPDATE Configuracion SET valor = ? WHERE clave = ?',
                [valor, clave]
            );
        }

        res.status(201).json({ message: 'Administrador creado correctamente' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Ya existe un admin con ese email' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// POST /sesion/reset-password/:dni
// El admin genera una nueva contraseña temporal y la envía al correo del empleado
router.post('/reset-password/:dni', async (req, res) => {
    try {
        const { dni } = req.params;
        const [rows] = await pool.query(
            'SELECT nombre_completo, email FROM Usuario WHERE dni = ? AND activo = 1',
            [dni]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Empleado no encontrado' });

        const { nombre_completo, email } = rows[0];
        if (!email) return res.status(400).json({ message: 'El empleado no tiene email registrado' });

        const nuevaPassword = randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(nuevaPassword, 10);

        await pool.query(
            'UPDATE Usuario SET password_hash = ?, cambiar_password = 1 WHERE dni = ?',
            [hash, dni]
        );

        await enviarPasswordTemporal(email, nombre_completo, nuevaPassword);
        res.json({ message: 'Nueva contraseña enviada al correo del empleado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

// GET /sesion/trabajando — publico, para la pantalla QR
router.get('/trabajando', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT nombre_completo, puesto FROM Usuario WHERE trabajando = 1 AND activo = 1 ORDER BY nombre_completo'
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

// GET /sesion/qr-token
// Devuelve el token QR actual y la URL pública del servidor para construir el QR
router.get('/qr-token', async (req, res) => {
    try {
        const token = getQrToken();
        const segundosRestantes = (10 * 60) - (Math.floor(Date.now() / 1000) % (10 * 60));

        const [rows] = await pool.query(
            "SELECT valor FROM Configuracion WHERE clave = 'server_url'"
        );
        const serverUrl = rows[0]?.valor || '';

        res.json({ token, caduca_en: segundosRestantes, server_url: serverUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

export default router;
