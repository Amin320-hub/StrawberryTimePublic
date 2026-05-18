import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

// GET /dispositivos — lista todos los dispositivos con info del empleado
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.id, d.device_id, d.estado, d.fecha_solicitud, d.fecha_aprobacion,
                   u.nombre_completo, u.dni
            FROM Dispositivo d
            JOIN Usuario u ON d.dni_usuario = u.dni
            ORDER BY (d.estado = 'pendiente') DESC, d.fecha_solicitud DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// PUT /dispositivos/:id/estado — aprobar (vinculado) o revocar
router.put('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['vinculado', 'revocado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado debe ser "vinculado" o "revocado"' });
    }
    try {
        await pool.query(
            'UPDATE Dispositivo SET estado = ?, fecha_aprobacion = NOW() WHERE id = ?',
            [estado, id]
        );
        res.json({ message: 'Estado actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
});

export default router;
