import React, { useEffect, useState } from "react";
import { fetchEmpleados } from "../controller/empleados";
import { getEstadisticasMes } from "../controller/estadisticas";
import { descargarCSV, descargarExcel } from "../controller/exportar";
import '../styles/HorariosMes.css';

function HorarioMes({ data, dni, nombre }) {
  const [estadisticas, setEstadisticas] = useState([]);

  async function cargarDatos() {
    try {
      setEstadisticas([]);
      const empleados = dni
        ? [{ dni, nombre_completo: nombre }]
        : await fetchEmpleados();

      if (empleados.length === 0) return;

      const resultados = await Promise.all(
        empleados.map(async empleado => {
          const estadisticasSemana = await getEstadisticasMes(empleado.dni, data);
          const semanasOrdenadas = [...estadisticasSemana].sort((a, b) => a.semana - b.semana);
          const totalHoras = semanasOrdenadas.reduce((acc, reg) =>
            acc + parseFloat(reg.horas_trabajadas_intervalo || 0), 0);

          return {
            nombre: empleado.nombre_completo,
            dni: empleado.dni,
            estadisticas: semanasOrdenadas,
            totalHoras: totalHoras.toFixed(2)
          };
        })
      );

      setEstadisticas(resultados);
    } catch (error) {
      console.error("Error al cargar las estadísticas mensuales:", error);
    }
  }

  function buildFilas() {
    return estadisticas.flatMap(emp =>
      emp.estadisticas.map(s => ({
        Nombre: emp.nombre,
        DNI: emp.dni,
        Mes: data,
        Semana: s.semana_del_mes,
        Horas: s.horas_trabajadas_intervalo + 'h',
      }))
    );
  }

  useEffect(() => {
    if (data.length > 0) {
      cargarDatos();
    }
  }, [data]);

  return (
    <div className="mes-container">
      {estadisticas.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className="btn-accion gris" onClick={() => descargarCSV(buildFilas(), `horas_mes_${data}`)}>
            Exportar CSV
          </button>
          <button className="btn-accion gris" onClick={() => descargarExcel(buildFilas(), `horas_mes_${data}`)}>
            Exportar Excel
          </button>
        </div>
      )}
      {estadisticas.map((empleado, index) => (
        <div key={index} className="mes-card">
          <h2 className="mes-nombre">{empleado.nombre}</h2>
          <p className="mes-dni">DNI: {empleado.dni}</p>

          {empleado.estadisticas.length > 0 ? (
            <>
              <table className="mes-tabla">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {empleado.estadisticas.map((semana, idx) => (
                    <tr key={idx}>
                      <td>Sem. {semana.semana_del_mes}</td>
                      <td>{semana.horas_trabajadas_intervalo}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mes-total">Total: {empleado.totalHoras}h</p>
            </>
          ) : (
            <p className="mes-sin-registros">Sin registros para este mes</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default HorarioMes;
