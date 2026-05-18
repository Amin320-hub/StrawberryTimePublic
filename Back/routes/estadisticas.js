// routes/estadisticas.mjs
import express from 'express';
import pool from '../conexiondb.js';
const router = express.Router();
router.get('/horas/dia/:dni', async (req, res) => {
  const { dni } = req.params;
  const { fecha } = req.query; // YYYY-MM-DD

  if (!fecha) {
    return res.status(400).json({ error: 'El parámetro fecha es obligatorio' });
  }

  const query = `
    SELECT *
    FROM (
      -- Parte del turno que pertenece al día consultado
      SELECT
        u.dni,
        u.nombre_completo,
        j.fecha AS fecha,
        ij.hora_entrada,
        CASE 
          WHEN ij.hora_salida < ij.hora_entrada THEN '23:59:59'
          ELSE ij.hora_salida
        END AS hora_salida,
        ROUND(
          TIME_TO_SEC(
            TIMEDIFF(
              CASE 
                WHEN ij.hora_salida < ij.hora_entrada THEN '23:59:59'
                ELSE ij.hora_salida
              END,
              ij.hora_entrada
            )
          ) / 3600, 2
        ) AS horas_trabajadas_intervalo
      FROM Usuario u
      JOIN Usuario_Jornada uj ON u.dni = uj.dni_usuario
      JOIN Jornada j ON uj.id_jornada = j.id
      JOIN Intervalo_Jornada ij ON ij.id_usuario_jornada = uj.id
      WHERE u.dni = ?

      UNION ALL

      -- Parte del turno que pertenece al día siguiente
      SELECT
        u.dni,
        u.nombre_completo,
        DATE_ADD(j.fecha, INTERVAL 1 DAY) AS fecha,
        '00:00:00' AS hora_entrada,
        ij.hora_salida AS hora_salida,
        ROUND(
          TIME_TO_SEC(TIMEDIFF(
            ij.hora_salida,
            '00:00:00'
          )) / 3600, 2
        ) AS horas_trabajadas_intervalo
      FROM Usuario u
      JOIN Usuario_Jornada uj ON u.dni = uj.dni_usuario
      JOIN Jornada j ON uj.id_jornada = j.id
      JOIN Intervalo_Jornada ij ON ij.id_usuario_jornada = uj.id
      WHERE u.dni = ?
        AND ij.hora_salida < ij.hora_entrada
    ) AS intervalos
    WHERE fecha = ?
    ORDER BY hora_entrada;
  `;

  try {
    // Paréntesis de parámetros: [dni, dni, fecha]
    const [rows] = await pool.query(query, [dni, dni, fecha]);
    res.json(rows);
  } catch (err) {
    console.error('Error por-dia:', err);
    res.status(500).json({ error: 'Error al obtener datos por día' });
  }
});





// Horas trabajadas por mes
router.get('/horas/mes/:dni', async (req, res) => {
  const { dni } = req.params;
  const { mes } = req.query; // formato 'YYYY-MM'

  if (!mes) {
    return res.status(400).json({ error: 'El parámetro mes es obligatorio' });
  }

  const [ano, mesNum] = mes.split('-');

  const query = `
    SELECT 
      u.dni,
      u.nombre_completo,
      YEAR(j.fecha) AS anio,
      MONTH(j.fecha) AS mes,
      FLOOR((DAY(j.fecha)-1)/7)+1 AS semana_del_mes,
      ROUND(SUM(
        TIMESTAMPDIFF(SECOND,
          CONCAT(DATE_FORMAT(j.fecha, '%Y-%m-%d'), ' ', TIME_FORMAT(i.hora_entrada, '%H:%i:%s')),
          CONCAT(DATE_FORMAT(DATE_ADD(j.fecha, INTERVAL (i.hora_salida < i.hora_entrada) DAY), '%Y-%m-%d'), ' ', TIME_FORMAT(i.hora_salida, '%H:%i:%s'))
        )
      ) / 3600, 2) AS horas_trabajadas_intervalo
    FROM Usuario u
    JOIN Usuario_Jornada uj ON u.dni = uj.dni_usuario
    JOIN Jornada j ON uj.id_jornada = j.id
    JOIN Intervalo_Jornada i ON i.id_usuario_jornada = uj.id
    WHERE u.dni = ? AND YEAR(j.fecha) = ? AND MONTH(j.fecha) = ? 
      AND i.hora_salida IS NOT NULL
    GROUP BY u.dni, anio, mes, semana_del_mes
    ORDER BY semana_del_mes;
  `;

  try {
    const [rows] = await pool.query(query, [dni, ano, mesNum]);
    res.json(rows);
  } catch (err) {
    console.error('Error por-semana:', err);
    res.status(500).json({ error: 'Error al obtener datos por semana' });
  }
});





// Horas trabajadas por año (12 meses, sin negativos, filtro de año correcto)
router.get('/horas/ano/:dni', async (req, res) => {
  const { dni } = req.params;
  const { ano } = req.query; // 'YYYY'

  if (!ano) {
    return res.status(400).json({ error: 'El parámetro año es obligatorio (ej: ?ano=2025)' });
  }

  const query = `
    SELECT
      u.dni,
      u.nombre_completo,
      ? AS anio,
      m.mes,
      ROUND(
        COALESCE(SUM(
          TIMESTAMPDIFF(SECOND,
            -- entrada: fecha_jornada + hora_entrada
            CONCAT(DATE_FORMAT(j.fecha, '%Y-%m-%d'), ' ', TIME_FORMAT(i.hora_entrada, '%H:%i:%s')),
            -- salida: si hora_salida < hora_entrada añadimos 1 día a la fecha de salida
            CONCAT(DATE_FORMAT(DATE_ADD(j.fecha, INTERVAL (i.hora_salida < i.hora_entrada) DAY), '%Y-%m-%d'), ' ', TIME_FORMAT(i.hora_salida, '%H:%i:%s'))
          )
        ), 0) / 3600, 2
      ) AS horas_trabajadas_intervalo
    FROM Usuario u
    CROSS JOIN (
      SELECT 1 AS mes UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
      UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
    ) m
    LEFT JOIN Usuario_Jornada uj ON uj.dni_usuario = u.dni
    LEFT JOIN Jornada j ON j.id = uj.id_jornada AND YEAR(j.fecha) = ? AND MONTH(j.fecha) = m.mes
    LEFT JOIN Intervalo_Jornada i ON i.id_usuario_jornada = uj.id AND i.hora_salida IS NOT NULL
    WHERE u.dni = ?
    GROUP BY u.dni, u.nombre_completo, m.mes
    ORDER BY m.mes;
  `;

  try {
    // Atención al orden de los placeholders: [?AS anio, YEAR(...)=?, WHERE u.dni=?] => [ano, ano, dni]
    const [rows] = await pool.query(query, [ano, ano, dni]);
    res.json(rows);
  } catch (err) {
    console.error('Error por-ano:', err);
    res.status(500).json({ error: 'Error al obtener datos por año' });
  }
});


// Total de horas trabajadas
router.get('/horas/total/:dni', async (req, res) => {
  const { dni } = req.params;

  const query = `
SELECT 
  u.dni,
  u.nombre_completo,
  YEAR(j.fecha) AS año,
  ROUND(
    SUM(
      TIMESTAMPDIFF(SECOND, ij.hora_entrada, ij.hora_salida) + 
      (
        CASE 
          WHEN ij.hora_salida < ij.hora_entrada THEN 86400
          ELSE 0
        END
      )
    ) / 3600, 
    2
  ) AS horas_totales
FROM Usuario u
JOIN Usuario_Jornada uj ON u.dni = uj.dni_usuario
JOIN Jornada j ON uj.id_jornada = j.id
JOIN Intervalo_Jornada ij ON ij.id_usuario_jornada = uj.id
WHERE u.dni = ? AND ij.hora_salida IS NOT NULL
GROUP BY u.dni, u.nombre_completo, año
ORDER BY año;
`;

  try {
    const [rows] = await pool.query(query, [dni]);
    res.json(rows);
  } catch (err) {
    console.error('Error total:', err);
    res.status(500).json({ error: 'Error al obtener el total de horas trabajadas' });
  }
});

export default router;