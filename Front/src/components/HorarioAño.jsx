import React, { useEffect, useState } from "react";
import { fetchEmpleados } from "../controller/empleados";
import { getEstadisticasAño } from "../controller/estadisticas";
import { descargarCSV, descargarExcel } from "../controller/exportar";
import '../styles/HorarioAño.css';

function HorarioAño({ data, dni, nombre }) {
  const [estadisticas, setEstadisticas] = useState([]);

  const meses = [
    'Ene', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  async function cargarDatos() {
    try {
      const empleados = dni
        ? [{ dni, nombre_completo: nombre }]
        : await fetchEmpleados();
      const resultados = await Promise.all(
        empleados.map(async empleado => {
          const estadisticasAño = await getEstadisticasAño(empleado.dni, data);
          
          // Formatear horas con 2 decimales
          const horasFormateadas = meses.map((mes, index) => {
            const mesData = estadisticasAño[index] || {};
            return mesData.horas_trabajadas_intervalo ? 
              parseFloat(mesData.horas_trabajadas_intervalo).toFixed(2) : '0.00';
          });

          // Calcular total de horas
          const totalHoras = horasFormateadas.reduce((sum, horas) => 
            sum + parseFloat(horas), 0);
          
          return {
            nombre: empleado.nombre_completo,
            dni: empleado.dni,
            horas: horasFormateadas,
            totalHoras: totalHoras.toFixed(2)
          };
        })
      );
      setEstadisticas(resultados);
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  }

  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function buildFilas() {
    return estadisticas.map(emp => {
      const fila = { Nombre: emp.nombre, DNI: emp.dni, Ano: data };
      nombresMeses.forEach((m, i) => { fila[m] = emp.horas[i] + 'h'; });
      fila['Total'] = emp.totalHoras + 'h';
      return fila;
    });
  }

  useEffect(() => {
    cargarDatos();
  }, [data]);

  return (
    <div className="horario-anual-container">
      {estadisticas.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className="btn-accion gris" onClick={() => descargarCSV(buildFilas(), `horas_ano_${data}`)}>
            Exportar CSV
          </button>
          <button className="btn-accion gris" onClick={() => descargarExcel(buildFilas(), `horas_ano_${data}`)}>
            Exportar Excel
          </button>
        </div>
      )}
      <div className="header">
        <h1>Horas trabajadas por año</h1>
        <div className="filtros">
          <span>Año seleccionado: {data}</span>
        </div>
      </div>

      {estadisticas.map((empleado, index) => (
        <div key={index} className="año-section">
          <h2 className="año-nombre">{empleado.nombre}</h2>
          
          <div className="meses-row">
            {meses.map((mes, i) => (
              <span key={i} className="mes-header">{mes}</span>
            ))}
          </div>
          
          <div className="horas-row">
            {empleado.horas.map((horas, i) => (
              <span key={i} className="hora-mes">{horas}</span>
            ))}
          </div>
          
          <div className="total-row">
            <span className="total-label">Total:</span>
            <span className="total-horas">{empleado.totalHoras}h</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default HorarioAño;