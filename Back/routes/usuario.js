import express from 'express';
import pool from '../conexiondb.js';

const router = express.Router();

// GET /usuarios
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE activo = 1');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /usuarios/:dni
router.get('/:dni', async (req, res) => {
  const { dni } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE dni = ?', [dni]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// PUT /usuarios/:dni
//editar usuario 
router.put('/:dni', async (req, res) => {
  const dniOriginal = req.params.dni;
  const { nombre_completo, puesto, email, dni: nuevoDni } = req.body;

  if (!nombre_completo || !nombre_completo.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const dniDestino = (nuevoDni || '').trim() || dniOriginal;
  if (!dniDestino) {
    return res.status(400).json({ error: 'El DNI es obligatorio' });
  }

  const emailLimpio = (email || '').trim() || null;
  if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
    return res.status(400).json({ error: 'El formato del email no es valido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET dni = ?, nombre_completo = ?, puesto = ?, email = ? WHERE dni = ?',
      [dniDestino, nombre_completo.trim(), puesto || null, emailLimpio, dniOriginal]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ mensaje: 'Usuario actualizado correctamente', dni: dniDestino });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese DNI ya esta en uso por otro empleado' });
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// PUT /usuarios/:dni/reactivar
router.put('/:dni/reactivar', async (req, res) => {
  const { dni } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET activo = 1 WHERE dni = ?',
      [dni]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ mensaje: 'Empleado reactivado correctamente' });
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /usuarios/inactivos — empleados dados de baja
router.get('/inactivos/lista', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE activo = 0');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios inactivos' });
  }
});

// DELETE /usuarios/:dni — baja suave, nunca se borra de la BD
router.delete('/:dni', async (req, res) => {
  const { dni } = req.params;
  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET activo = 0 WHERE dni = ?',
      [dni]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ mensaje: 'Empleado dado de baja correctamente' });
  } catch (error) {
    console.error('Error al dar de baja usuario:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /usuarios/:dni/trabajando
router.get('/:dni/trabajando', async (req, res) => {
  const { dni } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT trabajando FROM Usuario WHERE dni = ?',
      [dni]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ dni, trabajando: !!rows[0].trabajando });
  } catch (error) {
    console.error('Error al obtener estado trabajando:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /usuarios/:dni/trabajando
router.put('/:dni/trabajando', async (req, res) => {
  const { dni } = req.params;
  const { trabajando } = req.body;
  if (typeof trabajando !== 'boolean') {
    return res.status(400).json({ error: 'El campo "trabajando" debe ser booleano' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET trabajando = ? WHERE dni = ?',
      [trabajando, dni]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ dni, trabajando });
  } catch (error) {
    console.error('Error al actualizar estado trabajando:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

export default router;
