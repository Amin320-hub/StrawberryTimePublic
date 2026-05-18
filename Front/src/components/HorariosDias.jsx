import React, { useEffect, useState } from "react";
import { getEstadisticasDia } from "../controller/estadisticas";
import { fetchEmpleados } from "../controller/empleados";
import { descargarCSV, descargarExcel } from "../controller/exportar";
import API_URL, { apiFetch } from "../controller/api";
import '../styles/HorariosDias.css';

function HorariosDias({ data, dni, nombre, editable = false, adminId = null }) {
  const [estadisticas, setEstadisticas] = useState([]);
  const [editando, setEditando]         = useState(null);
  const [formEdit, setFormEdit]         = useState({});
  const [formNuevo, setFormNuevo]       = useState({ hora_entrada: '', hora_salida: '', motivo: '' });
  const [editMsg, setEditMsg]           = useState('');
  const [editError, setEditError]       = useState('');

  function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    return `${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')}/${fecha.getFullYear()}`;
  }

  function validarHoras(entrada, salida) {
    if (entrada && salida && salida <= entrada)
      return 'La hora de salida debe ser posterior a la de entrada';
    return null;
  }

  async function cargarDatos() {
    try {
      setEstadisticas([]);
      const empleados = dni ? [{ dni, nombre_completo: nombre }] : await fetchEmpleados();
      const nuevas = await Promise.all(
        empleados.map(async (emp) => {
          const registros = await getEstadisticasDia(emp.dni, data);
          if (!registros || registros.length === 0)
            return { nombre: emp.nombre_completo, dni: emp.dni, fecha: data, trabajo: null, registros: [] };
          const total = registros.reduce((a, c) => a + (parseFloat(c.horas_trabajadas_intervalo) || 0), 0);
          return {
            nombre: registros[0].nombre_completo,
            dni: registros[0].dni,
            fecha: registros[0].fecha,
            trabajo: total.toFixed(2),
            registros: registros.map(r => ({ entrada: r.hora_entrada, salida: r.hora_salida })),
          };
        })
      );
      setEstadisticas(nuevas);
    } catch (e) {
      console.error("Error al cargar datos:", e);
    }
  }

  async function abrirEdicion(dniEmp) {
    setEditMsg(''); setEditError('');
    const res = await apiFetch(`${API_URL}/jornadas/intervalos-dia?dni=${dniEmp}&fecha=${data}`);
    const intervalos = await res.json();
    const inicial = {};
    intervalos.forEach(iv => {
      inicial[iv.id] = { hora_entrada: iv.hora_entrada || '', hora_salida: iv.hora_salida || '', motivo: '' };
    });
    setFormEdit(inicial);
    setFormNuevo({ hora_entrada: '', hora_salida: '', motivo: '' });
    setEditando({ dniEmp, intervalos });
  }

  async function crearIntervalo(dniEmp) {
    if (!formNuevo.hora_entrada) {
      setEditError('La hora de entrada es obligatoria'); return;
    }
    const err = validarHoras(formNuevo.hora_entrada, formNuevo.hora_salida);
    if (err) { setEditError(err); return; }
    setEditError('');
    const res = await apiFetch(`${API_URL}/jornadas/intervalo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dni: dniEmp, fecha: data,
        hora_entrada: formNuevo.hora_entrada,
        hora_salida: formNuevo.hora_salida || null,
        motivo: formNuevo.motivo,
        admin_id: adminId,
      }),
    });
    if (res.ok) {
      setEditMsg('Intervalo creado correctamente');
      setFormNuevo({ hora_entrada: '', hora_salida: '', motivo: '' });
      cargarDatos();
      abrirEdicion(dniEmp);
      setTimeout(() => setEditMsg(''), 3000);
    } else {
      const d = await res.json();
      setEditError(d.error || 'Error al crear intervalo');
    }
  }

  async function guardarIntervalo(ivId) {
    setEditError('');
    const f = formEdit[ivId];
    if (!f) return;
    const err = validarHoras(f.hora_entrada, f.hora_salida);
    if (err) { setEditError(err); return; }
    try {
      const res = await apiFetch(`${API_URL}/jornadas/intervalo/${ivId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hora_entrada: f.hora_entrada, hora_salida: f.hora_salida || null, motivo: f.motivo, admin_id: adminId }),
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error || 'Error al guardar'); return; }
      setEditMsg('Guardado');
      cargarDatos();
      setTimeout(() => setEditMsg(''), 3000);
    } catch { setEditError('Error de conexion'); }
  }

  async function eliminarIntervalo(ivId) {
    setEditError('');
    try {
      const res = await apiFetch(`${API_URL}/jornadas/intervalo/${ivId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId }),
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error || 'Error al eliminar'); return; }
      setEditMsg('Intervalo eliminado');
      cargarDatos();
      abrirEdicion(editando.dniEmp);
      setTimeout(() => setEditMsg(''), 3000);
    } catch { setEditError('Error de conexion'); }
  }

  function buildFilas() {
    return estadisticas.map(emp => ({
      Nombre: emp.nombre, DNI: emp.dni, Fecha: emp.fecha,
      'Horas trabajadas': emp.trabajo ? emp.trabajo + 'h' : '0h',
    }));
  }

  useEffect(() => { cargarDatos(); }, [data]);

  return (
    <>
      {estadisticas.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button className="btn-accion gris" onClick={() => descargarCSV(buildFilas(), `horas_dia_${data}`)}>Exportar CSV</button>
          <button className="btn-accion gris" onClick={() => descargarExcel(buildFilas(), `horas_dia_${data}`)}>Exportar Excel</button>
        </div>
      )}

      {estadisticas.map((dia, index) => (
        <div key={index} className="dias-container">
          {/* Cabecera empleado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 className="dias-nombre">{dia.nombre}</h2>
              <p className="dias-fecha">Dia {formatearFecha(dia.fecha)}</p>
            </div>
            {editable && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {editando?.dniEmp === dia.dni ? (
                  <button className="btn-accion gris" style={{ fontSize: '12px' }} onClick={() => setEditando(null)}>Cerrar</button>
                ) : (
                  <button className="btn-accion gris" style={{ fontSize: '12px' }} onClick={() => abrirEdicion(dia.dni)}>Corregir horas</button>
                )}
              </div>
            )}
          </div>

          {/* Registros del dia */}
          {dia.registros.length > 0 ? (
            <>
              <ul className="dias-registros">
                {dia.registros.map((r, i) => (
                  <li key={i}>
                    <span><strong>Entrada:</strong> {r.entrada}</span>
                    <span><strong>Salida:</strong> {r.salida || '—'}</span>
                  </li>
                ))}
              </ul>
              {dia.trabajo && <p className="dias-total"><strong>Total horas:</strong> {dia.trabajo}h</p>}
            </>
          ) : (
            <p className="dias-sin-registros">Sin registros</p>
          )}

          {/* Panel de edicion/creacion */}
          {editable && editando?.dniEmp === dia.dni && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
              <p style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: '#333' }}>
                Correccion de horas — quedan registradas con motivo
              </p>

              {/* Intervalos existentes para editar */}
              {editando.intervalos.map((iv, idx) => (
                <div key={iv.id} style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Intervalo {idx + 1} — {iv.metodo_fichaje}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', color: '#555' }}>
                      Entrada
                      <input type="time" className="input-contraseña"
                        style={{ display: 'block', marginTop: '4px', width: '130px' }}
                        value={formEdit[iv.id]?.hora_entrada || ''}
                        onChange={e => setFormEdit(p => ({ ...p, [iv.id]: { ...p[iv.id], hora_entrada: e.target.value } }))}
                      />
                    </label>
                    <label style={{ fontSize: '13px', color: '#555' }}>
                      Salida
                      <input type="time" className="input-contraseña"
                        style={{ display: 'block', marginTop: '4px', width: '130px' }}
                        value={formEdit[iv.id]?.hora_salida || ''}
                        onChange={e => setFormEdit(p => ({ ...p, [iv.id]: { ...p[iv.id], hora_salida: e.target.value } }))}
                      />
                    </label>
                  </div>
                  <label style={{ fontSize: '13px', color: '#555', display: 'block' }}>
                    Motivo
                    <input type="text" className="input-contraseña"
                      style={{ display: 'block', marginTop: '4px' }}
                      placeholder="Ej: error en el fichaje, olvido de salida..."
                      value={formEdit[iv.id]?.motivo || ''}
                      onChange={e => setFormEdit(p => ({ ...p, [iv.id]: { ...p[iv.id], motivo: e.target.value } }))}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn-accion verde" style={{ fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => guardarIntervalo(iv.id)}>
                      Guardar
                    </button>
                    <button className="btn-accion rojo" style={{ fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => eliminarIntervalo(iv.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}

              {/* Formulario para añadir nuevo intervalo */}
              <div style={{ paddingTop: editando.intervalos.length > 0 ? '8px' : '0' }}>
                {editando.intervalos.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Anadir otro intervalo</p>
                )}
                {editando.intervalos.length === 0 && (
                  <p style={{ color: '#888', fontSize: '13px', marginBottom: '8px' }}>No hay fichaje para este dia. Crea un intervalo manualmente.</p>
                )}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#555' }}>
                    Entrada *
                    <input type="time" className="input-contraseña"
                      style={{ display: 'block', marginTop: '4px', width: '130px' }}
                      value={formNuevo.hora_entrada}
                      onChange={e => setFormNuevo(p => ({ ...p, hora_entrada: e.target.value }))}
                    />
                  </label>
                  <label style={{ fontSize: '13px', color: '#555' }}>
                    Salida
                    <input type="time" className="input-contraseña"
                      style={{ display: 'block', marginTop: '4px', width: '130px' }}
                      value={formNuevo.hora_salida}
                      onChange={e => setFormNuevo(p => ({ ...p, hora_salida: e.target.value }))}
                    />
                  </label>
                </div>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '8px' }}>
                  Motivo
                  <input type="text" className="input-contraseña"
                    style={{ display: 'block', marginTop: '4px' }}
                    placeholder="Ej: empleado olvido fichar..."
                    value={formNuevo.motivo}
                    onChange={e => setFormNuevo(p => ({ ...p, motivo: e.target.value }))}
                  />
                </label>
                <button className="btn-accion verde" style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => crearIntervalo(editando.dniEmp)}>
                  {editando.intervalos.length === 0 ? 'Crear intervalo' : 'Anadir intervalo'}
                </button>
              </div>

              {editMsg   && <p style={{ color: '#2e7d32', fontSize: '13px', marginTop: '8px' }}>{editMsg}</p>}
              {editError && <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '8px' }}>{editError}</p>}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default HorariosDias;
