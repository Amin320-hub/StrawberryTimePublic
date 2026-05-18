import express from 'express';
import pool from '../conexiondb.js';
import { validateQrToken } from '../crypto.js';

const router = express.Router();

// Función auxiliar para obtener id de jornada o crearla si no existe
async function getOrCreateJornada(fecha) {
  const [rows] = await pool.query('SELECT id FROM Jornada WHERE fecha = ?', [fecha]);
  if (rows.length > 0) {
    return rows[0].id;
  }
  // Crear jornada nueva
  const [result] = await pool.query('INSERT INTO Jornada (fecha) VALUES (?)', [fecha]);
  return result.insertId;
}

// POST /jornadas/entrada
router.post('/entrada', async (req, res) => {
  const { dni } = req.body;
  if (!dni) {
    return res.status(400).json({ error: 'dni es requerido' });
  }

  try {
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const jornadaId = await getOrCreateJornada(fechaHoy);

    // Verificar o crear Usuario_Jornada
    const [existing] = await pool.query(
      'SELECT id FROM Usuario_Jornada WHERE dni_usuario = ? AND id_jornada = ?',
      [dni, jornadaId]
    );

    let usuarioJornadaId;
    if (existing.length > 0) {
      usuarioJornadaId = existing[0].id;
    } else {
      const [result] = await pool.query(
        'INSERT INTO Usuario_Jornada (dni_usuario, id_jornada) VALUES (?, ?)',
        [dni, jornadaId]
      );
      usuarioJornadaId = result.insertId;
    }

    // Insertar intervalo con solo hora de entrada
    const horaEntrada = new Date().toTimeString().slice(0, 8);

    await pool.query(
      'INSERT INTO Intervalo_Jornada (id_usuario_jornada, hora_entrada) VALUES (?, ?)',
      [usuarioJornadaId, horaEntrada]
    );

    res.json({ mensaje: 'Entrada registrada', horaEntrada });
  } catch (error) {
    console.error('Error al fichar entrada:', error);
    res.status(500).json({ error: 'Error al fichar entrada' });
  }
});
// POST /jornadas/salida
router.post('/salida', async (req, res) => {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ error: 'dni es requerido' });

  try {
    // Buscamos el último intervalo sin hora_salida del usuario (cualquier jornada)
    const [rows] = await pool.query(
      `SELECT ij.id AS intervaloId, ij.hora_entrada, uj.id AS usuarioJornadaId, j.fecha AS jornada_fecha
       FROM Intervalo_Jornada ij
       JOIN Usuario_Jornada uj ON ij.id_usuario_jornada = uj.id
       JOIN Jornada j ON uj.id_jornada = j.id
       WHERE uj.dni_usuario = ? AND ij.hora_salida IS NULL
       ORDER BY ij.id DESC
       LIMIT 1`,
      [dni]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No hay entrada sin salida registrada' });
    }

    const intervaloId = rows[0].intervaloId;
    const horaSalida = new Date().toTimeString().slice(0, 8);

    await pool.query(
      'UPDATE Intervalo_Jornada SET hora_salida = ? WHERE id = ?',
      [horaSalida, intervaloId]
    );

    res.json({ mensaje: 'Salida registrada', horaSalida });
  } catch (error) {
    console.error('Error al fichar salida:', error);
    res.status(500).json({ error: 'Error al fichar salida' });
  }
});

// GET /jornadas/horas/:dni (opcional) para consultar horas trabajadas hoy
router.get('/horas/:dni', async (req, res) => {
  const { dni } = req.params;
  try {
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const [jornada] = await pool.query('SELECT id FROM Jornada WHERE fecha = ?', [fechaHoy]);
    if (jornada.length === 0) {
      return res.status(404).json({ error: 'No hay jornada para hoy' });
    }
    const jornadaId = jornada[0].id;

    const [registro] = await pool.query(
      `SELECT 
  uj.dni_usuario,
  uj.id_jornada,
  ROUND(SUM(TIME_TO_SEC(TIMEDIFF(ij.hora_salida, ij.hora_entrada))) / 3600, 2) AS horas_trabajadas
FROM 
  Usuario_Jornada uj
JOIN 
  Intervalo_Jornada ij ON ij.id_usuario_jornada = uj.id
WHERE 
  uj.dni_usuario = ?
  AND uj.id_jornada = ?
GROUP BY 
  uj.dni_usuario, uj.id_jornada;
`,
      [dni, jornadaId]
    );

    if (registro.length === 0) {
      return res.status(404).json({ error: 'No hay fichaje para hoy' });
    }
    res.json(registro[0]);
  } catch (error) {
    console.error('Error al consultar horas:', error);
    res.status(500).json({ error: 'Error al consultar horas' });
  }
});

// POST /jornadas/fichar-qr
// Fichaje por QR: valida el token y hace entrada o salida según el estado actual
// Acepta device_id para vincular el dispositivo al empleado
router.post('/fichar-qr', async (req, res) => {
    const { dni, qr_token, device_id } = req.body;

    if (!dni || !qr_token) {
        return res.status(400).json({ error: 'dni y qr_token obligatorios' });
    }

    if (!validateQrToken(qr_token)) {
        return res.status(401).json({ error: 'QR caducado o inválido. Escanea el código de nuevo.' });
    }

    try {
        // Verificar dispositivo si se proporciona device_id
        if (device_id) {
            const [todosDispositivos] = await pool.query(
                'SELECT device_id, estado FROM Dispositivo WHERE dni_usuario = ?',
                [dni]
            );

            const vinculado  = todosDispositivos.find(d => d.estado === 'vinculado');
            const esteDevice = todosDispositivos.find(d => d.device_id === device_id);

            if (todosDispositivos.length === 0) {
                // Primer uso — vincular automaticamente este dispositivo
                await pool.query(
                    'INSERT INTO Dispositivo (dni_usuario, device_id, estado, fecha_aprobacion) VALUES (?, ?, "vinculado", NOW())',
                    [dni, device_id]
                );
            } else if (vinculado) {
                if (vinculado.device_id !== device_id) {
                    // Dispositivo diferente al autorizado — registrar como pendiente y bloquear
                    await pool.query(
                        'INSERT IGNORE INTO Dispositivo (dni_usuario, device_id, estado) VALUES (?, ?, "pendiente")',
                        [dni, device_id]
                    );
                    return res.status(403).json({
                        error: 'Este dispositivo no esta autorizado. Contacta con el administrador para vincular este movil.'
                    });
                }
                // Coincide con el vinculado — continuar
            } else {
                // No hay vinculado (puede haber pendientes o revocados)
                if (!esteDevice) {
                    await pool.query(
                        'INSERT IGNORE INTO Dispositivo (dni_usuario, device_id, estado) VALUES (?, ?, "pendiente")',
                        [dni, device_id]
                    );
                    return res.status(403).json({
                        error: 'Solicitud de vinculacion enviada al administrador. Espera a que apruebe este dispositivo.'
                    });
                } else if (esteDevice.estado === 'revocado') {
                    return res.status(403).json({
                        error: 'Este dispositivo ha sido desvinculado. Contacta con el administrador.'
                    });
                } else if (esteDevice.estado === 'pendiente') {
                    return res.status(403).json({
                        error: 'Tu dispositivo esta pendiente de aprobacion. Contacta con el administrador.'
                    });
                }
            }
        }

        const [usuarios] = await pool.query(
            'SELECT trabajando FROM Usuario WHERE dni = ? AND activo = 1',
            [dni]
        );

        if (!usuarios.length) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        const trabajando = usuarios[0].trabajando;

        if (!trabajando) {
            // Entrada
            const fechaHoy = new Date().toISOString().slice(0, 10);
            const jornadaId = await getOrCreateJornada(fechaHoy);

            const [existing] = await pool.query(
                'SELECT id FROM Usuario_Jornada WHERE dni_usuario = ? AND id_jornada = ?',
                [dni, jornadaId]
            );

            let usuarioJornadaId;
            if (existing.length > 0) {
                usuarioJornadaId = existing[0].id;
            } else {
                const [result] = await pool.query(
                    'INSERT INTO Usuario_Jornada (dni_usuario, id_jornada) VALUES (?, ?)',
                    [dni, jornadaId]
                );
                usuarioJornadaId = result.insertId;
            }

            const horaEntrada = new Date().toTimeString().slice(0, 8);
            await pool.query(
                "INSERT INTO Intervalo_Jornada (id_usuario_jornada, hora_entrada, metodo_fichaje) VALUES (?, ?, 'qr')",
                [usuarioJornadaId, horaEntrada]
            );
            await pool.query('UPDATE Usuario SET trabajando = 1 WHERE dni = ?', [dni]);

            return res.json({ accion: 'entrada', hora: horaEntrada });
        } else {
            // Salida
            const [rows] = await pool.query(
                `SELECT ij.id
                 FROM Intervalo_Jornada ij
                 JOIN Usuario_Jornada uj ON ij.id_usuario_jornada = uj.id
                 WHERE uj.dni_usuario = ? AND ij.hora_salida IS NULL
                 ORDER BY ij.id DESC LIMIT 1`,
                [dni]
            );

            if (!rows.length) {
                return res.status(400).json({ error: 'No hay entrada sin salida registrada' });
            }

            const horaSalida = new Date().toTimeString().slice(0, 8);
            await pool.query(
                'UPDATE Intervalo_Jornada SET hora_salida = ? WHERE id = ?',
                [horaSalida, rows[0].id]
            );
            await pool.query('UPDATE Usuario SET trabajando = 0 WHERE dni = ?', [dni]);

            return res.json({ accion: 'salida', hora: horaSalida });
        }
    } catch (error) {
        console.error('Error en fichar-qr:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// POST /jornadas/fichar-manual
// El admin ficha entrada o salida por un empleado (cuando no tiene móvil disponible)
router.post('/fichar-manual', async (req, res) => {
    const { dni, tipo } = req.body;

    if (!dni || !tipo || !['entrada', 'salida'].includes(tipo)) {
        return res.status(400).json({ error: 'dni y tipo (entrada/salida) son obligatorios' });
    }

    try {
        const [usuarios] = await pool.query(
            'SELECT trabajando FROM Usuario WHERE dni = ? AND activo = 1',
            [dni]
        );

        if (!usuarios.length) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        const trabajando = usuarios[0].trabajando;

        if (tipo === 'entrada') {
            if (trabajando) return res.status(400).json({ error: 'El empleado ya tiene entrada fichada' });

            const fechaHoy = new Date().toISOString().slice(0, 10);
            const jornadaId = await getOrCreateJornada(fechaHoy);

            const [existing] = await pool.query(
                'SELECT id FROM Usuario_Jornada WHERE dni_usuario = ? AND id_jornada = ?',
                [dni, jornadaId]
            );

            let usuarioJornadaId;
            if (existing.length > 0) {
                usuarioJornadaId = existing[0].id;
            } else {
                const [result] = await pool.query(
                    'INSERT INTO Usuario_Jornada (dni_usuario, id_jornada) VALUES (?, ?)',
                    [dni, jornadaId]
                );
                usuarioJornadaId = result.insertId;
            }

            const horaEntrada = new Date().toTimeString().slice(0, 8);
            await pool.query(
                "INSERT INTO Intervalo_Jornada (id_usuario_jornada, hora_entrada, metodo_fichaje) VALUES (?, ?, 'manual')",
                [usuarioJornadaId, horaEntrada]
            );
            await pool.query('UPDATE Usuario SET trabajando = 1 WHERE dni = ?', [dni]);

            return res.json({ accion: 'entrada', hora: horaEntrada });
        } else {
            if (!trabajando) return res.status(400).json({ error: 'El empleado no está fichado en este momento' });

            const [rows] = await pool.query(
                `SELECT ij.id
                 FROM Intervalo_Jornada ij
                 JOIN Usuario_Jornada uj ON ij.id_usuario_jornada = uj.id
                 WHERE uj.dni_usuario = ? AND ij.hora_salida IS NULL
                 ORDER BY ij.id DESC LIMIT 1`,
                [dni]
            );

            if (!rows.length) return res.status(400).json({ error: 'No hay entrada sin salida registrada' });

            const horaSalida = new Date().toTimeString().slice(0, 8);
            await pool.query(
                'UPDATE Intervalo_Jornada SET hora_salida = ? WHERE id = ?',
                [horaSalida, rows[0].id]
            );
            await pool.query('UPDATE Usuario SET trabajando = 0 WHERE dni = ?', [dni]);

            return res.json({ accion: 'salida', hora: horaSalida });
        }
    } catch (error) {
        console.error('Error en fichar-manual:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// GET /jornadas/intervalos-dia?dni=...&fecha=YYYY-MM-DD
// Devuelve los intervalos con sus IDs para poder editarlos
router.get('/intervalos-dia', async (req, res) => {
    const { dni, fecha } = req.query;
    if (!dni || !fecha) return res.status(400).json({ error: 'dni y fecha obligatorios' });
    try {
        const [rows] = await pool.query(`
            SELECT ij.id, ij.hora_entrada, ij.hora_salida, ij.metodo_fichaje,
                   u.nombre_completo, u.dni
            FROM Intervalo_Jornada ij
            JOIN Usuario_Jornada uj ON ij.id_usuario_jornada = uj.id
            JOIN Jornada j ON uj.id_jornada = j.id
            JOIN Usuario u ON uj.dni_usuario = u.dni
            WHERE uj.dni_usuario = ? AND j.fecha = ?
            ORDER BY ij.id
        `, [dni, fecha]);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener intervalos' });
    }
});

// PUT /jornadas/intervalo/:id
// El admin corrige horas de un intervalo. Queda constancia en Modificacion_Horas
// y el trigger de BD también registra el cambio en Auditoria automáticamente.
router.put('/intervalo/:id', async (req, res) => {
    const { id } = req.params;
    const { hora_entrada, hora_salida, motivo, admin_id } = req.body;
    if (!admin_id) return res.status(400).json({ error: 'admin_id obligatorio' });

    try {
        const [rows] = await pool.query(
            'SELECT hora_entrada, hora_salida FROM Intervalo_Jornada WHERE id = ?', [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Intervalo no encontrado' });

        const antes = rows[0];
        const nuevaEntrada = hora_entrada || antes.hora_entrada;
        const nuevaSalida  = hora_salida !== undefined ? hora_salida : antes.hora_salida;
        const motivoFinal  = (motivo || '').trim();

        await pool.query(`
            INSERT INTO Modificacion_Horas
              (id_intervalo, admin_id, hora_entrada_antes, hora_salida_antes, hora_entrada_despues, hora_salida_despues, motivo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, admin_id, antes.hora_entrada, antes.hora_salida, nuevaEntrada, nuevaSalida, motivoFinal]);

        await pool.query(
            'UPDATE Intervalo_Jornada SET hora_entrada = ?, hora_salida = ? WHERE id = ?',
            [nuevaEntrada, nuevaSalida, id]
        );

        await pool.query(
            `INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle) VALUES ('admin', ?, 'correccion_horas', ?)`,
            [String(admin_id), JSON.stringify({
                id_intervalo: Number(id),
                entrada_antes: antes.hora_entrada,
                salida_antes: antes.hora_salida,
                entrada_despues: nuevaEntrada,
                salida_despues: nuevaSalida,
                motivo: motivoFinal,
            })]
        );

        res.json({ message: 'Intervalo actualizado' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al actualizar intervalo' });
    }
});

// DELETE /jornadas/intervalo/:id
router.delete('/intervalo/:id', async (req, res) => {
    const { id } = req.params;
    const { admin_id } = req.body;
    if (!admin_id) return res.status(400).json({ error: 'admin_id obligatorio' });

    try {
        const [rows] = await pool.query(
            'SELECT hora_entrada, hora_salida FROM Intervalo_Jornada WHERE id = ?', [id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Intervalo no encontrado' });

        await pool.query('DELETE FROM Intervalo_Jornada WHERE id = ?', [id]);

        await pool.query(
            `INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle) VALUES ('admin', ?, 'eliminar_intervalo_manual', ?)`,
            [String(admin_id), JSON.stringify({
                id_intervalo: Number(id),
                entrada: rows[0].hora_entrada,
                salida: rows[0].hora_salida,
            })]
        );

        res.json({ message: 'Intervalo eliminado' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al eliminar intervalo' });
    }
});

// POST /jornadas/intervalo
// El admin crea un intervalo desde cero para un empleado que no fichó ese día
router.post('/intervalo', async (req, res) => {
    const { dni, fecha, hora_entrada, hora_salida, motivo, admin_id } = req.body;
    if (!dni || !fecha || !hora_entrada)
        return res.status(400).json({ error: 'dni, fecha y hora_entrada son obligatorios' });
    if (!admin_id)
        return res.status(400).json({ error: 'admin_id obligatorio' });

    try {
        const jornadaId = await getOrCreateJornada(fecha);

        const [existing] = await pool.query(
            'SELECT id FROM Usuario_Jornada WHERE dni_usuario = ? AND id_jornada = ?',
            [dni, jornadaId]
        );
        let usuarioJornadaId;
        if (existing.length > 0) {
            usuarioJornadaId = existing[0].id;
        } else {
            const [result] = await pool.query(
                'INSERT INTO Usuario_Jornada (dni_usuario, id_jornada) VALUES (?, ?)',
                [dni, jornadaId]
            );
            usuarioJornadaId = result.insertId;
        }

        const [insert] = await pool.query(
            'INSERT INTO Intervalo_Jornada (id_usuario_jornada, hora_entrada, hora_salida, metodo_fichaje) VALUES (?, ?, ?, ?)',
            [usuarioJornadaId, hora_entrada, hora_salida || null, 'manual']
        );
        const intervaloId = insert.insertId;
        const motivoFinal = (motivo || '').trim() || null;

        await pool.query(`
            INSERT INTO Modificacion_Horas
              (id_intervalo, admin_id, hora_entrada_antes, hora_salida_antes, hora_entrada_despues, hora_salida_despues, motivo)
            VALUES (?, ?, NULL, NULL, ?, ?, ?)
        `, [intervaloId, admin_id, hora_entrada, hora_salida || null, motivoFinal]);

        await pool.query(
            `INSERT INTO Auditoria (actor_tipo, actor_id, accion, detalle) VALUES ('admin', ?, 'crear_intervalo', ?)`,
            [String(admin_id), JSON.stringify({
                id_intervalo: intervaloId,
                dni,
                fecha,
                entrada: hora_entrada,
                salida: hora_salida || null,
                motivo: motivoFinal,
            })]
        );

        res.status(201).json({ message: 'Intervalo creado', id: intervaloId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al crear intervalo' });
    }
});

export default router;
