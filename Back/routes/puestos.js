import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, nombre FROM Puesto ORDER BY nombre');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

router.post('/', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim())
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    try {
        const [result] = await pool.query('INSERT INTO Puesto (nombre) VALUES (?)', [nombre.trim()]);
        res.status(201).json({ id: result.insertId, nombre: nombre.trim() });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY')
            return res.status(409).json({ error: 'Ese puesto ya existe' });
        res.status(500).json({ error: 'Error interno' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM Puesto WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'Puesto no encontrado' });
        res.json({ mensaje: 'Puesto eliminado' });
    } catch (e) {
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;
