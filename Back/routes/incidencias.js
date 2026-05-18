import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

// GET /incidencias — todas (admin)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT i.*, u.nombre_completo
            FROM Incidencia i
            JOIN Usuario u ON i.dni_usuario = u.dni
            ORDER BY i.created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener incidencias' });
    }
});

// GET /incidencias/usuario/:dni — propias del empleado
router.get('/usuario/:dni', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM Incidencia WHERE dni_usuario = ? ORDER BY created_at DESC',
            [req.params.dni]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener incidencias' });
    }
});

// POST /incidencias — crear (empleado o admin)
router.post('/', async (req, res) => {
    const { dni_usuario, tipo, descripcion, fecha } = req.body;
    if (!dni_usuario || !tipo || !descripcion || !fecha) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO Incidencia (dni_usuario, tipo, descripcion, fecha) VALUES (?, ?, ?, ?)',
            [dni_usuario, tipo, descripcion, fecha]
        );
        res.status(201).json({ id: result.insertId, message: 'Incidencia creada' });
    } catch (e) {
        res.status(500).json({ error: 'Error al crear incidencia' });
    }
});

// PUT /incidencias/:id — responder y cambiar estado (admin)
router.put('/:id', async (req, res) => {
    const { estado, respuesta_admin, admin_id } = req.body;
    const { id } = req.params;
    if (!estado) return res.status(400).json({ error: 'estado obligatorio' });
    try {
        await pool.query(
            'UPDATE Incidencia SET estado = ?, respuesta_admin = ?, respondido_por = ? WHERE id = ?',
            [estado, respuesta_admin || null, admin_id || null, id]
        );
        res.json({ message: 'Incidencia actualizada' });
    } catch (e) {
        res.status(500).json({ error: 'Error al actualizar incidencia' });
    }
});

export default router;
