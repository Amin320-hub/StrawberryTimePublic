import React, { useEffect, useState } from 'react';
import { fetchEmpleados } from '../controller/empleados';
import { getEstadisticastotal } from '../controller/estadisticas';
import { descargarCSV, descargarExcel } from '../controller/exportar';
import '../styles/HorarioTotal.css';

function HorarioTotal({ dni, nombre }) {
    const [estadisticas, setEstadisticas] = useState([]);
    const [cargando, setCargando] = useState(true);

    const columnasPorFila = 6;

    async function cargarDatos() {
        try {
            setCargando(true);
            const empleados = dni
                ? [{ dni, nombre_completo: nombre }]
                : await fetchEmpleados();
            const resultados = await Promise.all(
                empleados.map(async empleado => {
                    const estadisticasTotal = await getEstadisticastotal(empleado.dni);
                    
                    // Ordenar por año y formatear datos
                    const datosOrdenados = estadisticasTotal
                        .sort((a, b) => a.año - b.año)
                        .map(item => ({
                            año: item.año.toString(),
                            horas: parseFloat(item.horas_totales).toFixed(2)
                        }));

                    const totalHoras = datosOrdenados.reduce((sum, item) => 
                        sum + parseFloat(item.horas), 0);
                    
                    return {
                        nombre: empleado.nombre_completo,
                        dni: empleado.dni,
                        estadisticas: datosOrdenados,
                        totalHoras: totalHoras.toFixed(2) + 'h'
                    };
                })
            );
            setEstadisticas(resultados);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setCargando(false);
        }
    }

    // Función para dividir los datos en filas
    const dividirEnFilas = (datos) => {
        const filas = [];
        for (let i = 0; i < datos.length; i += columnasPorFila) {
            filas.push(datos.slice(i, i + columnasPorFila));
        }
        return filas;
    };

    useEffect(() => {
        cargarDatos();
    }, []);

  function buildFilas() {
      return estadisticas.flatMap(emp =>
          emp.estadisticas.map(s => ({
              Nombre: emp.nombre,
              DNI: emp.dni,
              Ano: s.año,
              Horas: s.horas + 'h',
          }))
      );
  }

    if (cargando) return <div className="cargando">Cargando datos...</div>;
    if (estadisticas.length === 0) return <div>No hay datos disponibles</div>;

    return (
        <div className="horario-total-container">
            {estadisticas.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <button className="btn-accion gris" onClick={() => descargarCSV(buildFilas(), 'horas_total')}>
                        Exportar CSV
                    </button>
                    <button className="btn-accion gris" onClick={() => descargarExcel(buildFilas(), 'horas_total')}>
                        Exportar Excel
                    </button>
                </div>
            )}
            {estadisticas.map((empleado) => (
                <div key={empleado.dni} className="total-card">
                    <div className="total-header">
                        <h2>{empleado.nombre}</h2>
                        <p>DNI: {empleado.dni}</p>
                    </div>

                    {empleado.estadisticas.length > 0 ? (
                        <>
                            {dividirEnFilas(empleado.estadisticas).map((fila, filaIndex) => (
                                <div key={filaIndex} className="datos-fila">
                                    {/* Fila de años */}
                                    <div className="años-fila">
                                        {fila.map((item, index) => (
                                            <span key={`año-${index}`} className="año-item">
                                                {item.año}
                                            </span>
                                        ))}
                                    </div>
                                    {/* Fila de horas debajo de cada año */}
                                    <div className="horas-fila">
                                        {fila.map((item, index) => (
                                            <span key={`hora-${index}`} className="hora-item">
                                                {item.horas}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            
                            <div className="total-horas">
                                <strong>Total horas trabajadas:</strong> {empleado.totalHoras}
                            </div>
                        </>
                    ) : (
                        <p className="sin-datos">No hay datos históricos</p>
                    )}
                </div>
            ))}
        </div>
    );
}

export default HorarioTotal;