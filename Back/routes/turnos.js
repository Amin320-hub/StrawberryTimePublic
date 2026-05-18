import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

// GET /turnos?dni=&mes=YYYY-MM
router.get('/', async (req, res) => {
    const { dni, mes } = req.query;
    if (!dni || !mes) return res.status(400).json({ error: 'dni y mes son obligatorios' });
    try {
        const [rows] = await pool.query(
            `SELECT id, dni_usuario, fecha, hora_inicio, hora_fin
             FROM Turno
             WHERE dni_usuario = ? AND DATE_FORMAT(fecha, '%Y-%m') = ?
             ORDER BY fecha, hora_inicio`,
            [dni, mes]
        );
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /turnos — crea un turno nuevo (permite varios por dia)
router.post('/', async (req, res) => {
    const { dni_usuario, fecha, hora_inicio, hora_fin, admin_id } = req.body;
    if (!dni_usuario || !fecha || !hora_inicio || !hora_fin || !admin_id)
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    if (hora_inicio >= hora_fin)
        return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin' });
    try {
        const [result] = await pool.query(
            'INSERT INTO Turno (dni_usuario, fecha, hora_inicio, hora_fin, admin_id) VALUES (?, ?, ?, ?, ?)',
            [dni_usuario, fecha, hora_inicio, hora_fin, admin_id]
        );
        res.status(201).json({ message: 'Turno creado', id: result.insertId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /turnos/:id
router.put('/:id', async (req, res) => {
    const { hora_inicio, hora_fin } = req.body;
    if (!hora_inicio || !hora_fin)
        return res.status(400).json({ error: 'hora_inicio y hora_fin son obligatorios' });
    if (hora_inicio >= hora_fin)
        return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin' });
    try {
        await pool.query(
            'UPDATE Turno SET hora_inicio = ?, hora_fin = ? WHERE id = ?',
            [hora_inicio, hora_fin, req.params.id]
        );
        res.json({ message: 'Turno actualizado' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

// DELETE /turnos/:id
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM Turno WHERE id = ?', [req.params.id]);
        res.json({ message: 'Turno eliminado' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;
