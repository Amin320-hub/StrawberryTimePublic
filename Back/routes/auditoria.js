import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

// GET /auditoria — solo lectura
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, actor_tipo, actor_id, accion, detalle, ip, created_at FROM Auditoria ORDER BY created_at DESC LIMIT 500'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno' });
    }
});

export default router;
