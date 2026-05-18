import React, { useState, useEffect } from 'react';
import API_URL, { apiFetch } from '../controller/api';
import { fetchEmpleados } from '../controller/empleados';

function diasDelMes(mes) {
  const [anyo, m] = mes.split('-').map(Number);
  const total = new Date(anyo, m, 0).getDate();
  const dias = [];
  for (let d = 1; d <= total; d++) {
    const fecha = `${anyo}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const nombre = new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short' });
    dias.push({ fecha, nombre });
  }
  return dias;
}

function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
}

// readonly=true para la vista del empleado (sin admin)
export default function TurnosEmpleado({ adminId, readonly = false, dniEmpleado = null }) {
  const [empleados, setEmpleados]   = useState([]);
  const [dniSel, setDniSel]         = useState(dniEmpleado || '');
  const [mes, setMes]               = useState(mesActual());
  // { [fecha]: [{ id, hora_inicio, hora_fin }] }
  const [turnos, setTurnos]         = useState({});
  // { [fecha]: { hora_inicio, hora_fin } } — formulario para añadir en esa fecha
  const [addForm, setAddForm]       = useState({});
  // { [id]: { hora_inicio, hora_fin } } — formulario para editar turno existente
  const [editForm, setEditForm]     = useState({});
  const [msg, setMsg]               = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!readonly) fetchEmpleados().then(setEmpleados);
  }, [readonly]);

  useEffect(() => {
    if (!dniSel) return;
    cargarTurnos();
  }, [dniSel, mes]);

  function cargarTurnos() {
    apiFetch(`${API_URL}/turnos?dni=${dniSel}&mes=${mes}`)
      .then(r => r.json())
      .then(rows => {
        const mapa = {};
        rows.forEach(t => {
          const f = t.fecha.slice(0, 10);
          if (!mapa[f]) mapa[f] = [];
          mapa[f].push(t);
        });
        setTurnos(mapa);
      });
  }

  async function agregarTurno(fecha) {
    const f = addForm[fecha] || {};
    if (!f.hora_inicio || !f.hora_fin) { setError('Hora de inicio y fin obligatorias'); return; }
    if (f.hora_inicio >= f.hora_fin) { setError('El inicio debe ser anterior al fin'); return; }
    setError('');
    const res = await apiFetch(`${API_URL}/turnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni_usuario: dniSel, fecha, hora_inicio: f.hora_inicio, hora_fin: f.hora_fin, admin_id: adminId }),
    });
    if (res.ok) {
      setAddForm(prev => { const n = {...prev}; delete n[fecha]; return n; });
      setMsg('Turno guardado'); setTimeout(() => setMsg(''), 2000);
      cargarTurnos();
    } else {
      const d = await res.json(); setError(d.error || 'Error al guardar');
    }
  }

  async function actualizarTurno(id) {
    const f = editForm[id];
    if (!f?.hora_inicio || !f?.hora_fin) { setError('Hora de inicio y fin obligatorias'); return; }
    if (f.hora_inicio >= f.hora_fin) { setError('El inicio debe ser anterior al fin'); return; }
    setError('');
    const res = await apiFetch(`${API_URL}/turnos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hora_inicio: f.hora_inicio, hora_fin: f.hora_fin }),
    });
    if (res.ok) {
      setEditForm(prev => { const n = {...prev}; delete n[id]; return n; });
      setMsg('Turno actualizado'); setTimeout(() => setMsg(''), 2000);
      cargarTurnos();
    } else {
      const d = await res.json(); setError(d.error || 'Error al actualizar');
    }
  }

  async function eliminarTurno(id) {
    const res = await apiFetch(`${API_URL}/turnos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMsg('Turno eliminado'); setTimeout(() => setMsg(''), 2000);
      cargarTurnos();
    }
  }

  function abrirEdicion(t) {
    setEditForm(prev => ({ ...prev, [t.id]: { hora_inicio: t.hora_inicio, hora_fin: t.hora_fin } }));
  }

  function abrirAgregar(fecha) {
    setAddForm(prev => ({ ...prev, [fecha]: { hora_inicio: '', hora_fin: '' } }));
  }

  const dias = mes ? diasDelMes(mes) : [];

  const inputStyle = { padding: '4px 6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'flex-end' }}>
        {!readonly && (
          <label style={{ fontSize: '13px', color: '#555' }}>
            Empleado
            <select value={dniSel} onChange={e => setDniSel(e.target.value)}
              style={{ display: 'block', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', minWidth: '200px' }}>
              <option value="">-- Seleccionar --</option>
              {empleados.map(e => <option key={e.dni} value={e.dni}>{e.nombre_completo}</option>)}
            </select>
          </label>
        )}
        <label style={{ fontSize: '13px', color: '#555' }}>
          Mes
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ display: 'block', marginTop: '4px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
          />
        </label>
      </div>

      {msg   && <p style={{ color: '#2e7d32', fontSize: '13px', marginBottom: '10px' }}>{msg}</p>}
      {error && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '10px' }}>{error}</p>}

      {!dniSel ? (
        <p style={{ color: '#aaa', fontSize: '14px' }}>Selecciona un empleado para ver su horario</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className='tabla'>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Dia</th>
                <th style={{ width: '80px' }}>Fecha</th>
                <th>Turnos asignados</th>
                {!readonly && <th style={{ width: '90px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {dias.map(({ fecha, nombre }) => {
                const listaTurnos = turnos[fecha] || [];
                const formAdd = addForm[fecha];
                return (
                  <tr key={fecha} style={{ verticalAlign: 'top' }}>
                    <td style={{ color: '#888', fontSize: '13px', paddingTop: '12px' }}>{nombre}</td>
                    <td style={{ paddingTop: '12px' }}>{fecha.slice(8)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' }}>
                        {listaTurnos.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {editForm[t.id] ? (
                              <>
                                <input type="time" value={editForm[t.id].hora_inicio}
                                  onChange={e => setEditForm(p => ({ ...p, [t.id]: { ...p[t.id], hora_inicio: e.target.value } }))}
                                  style={inputStyle}
                                />
                                <span style={{ color: '#aaa' }}>—</span>
                                <input type="time" value={editForm[t.id].hora_fin}
                                  onChange={e => setEditForm(p => ({ ...p, [t.id]: { ...p[t.id], hora_fin: e.target.value } }))}
                                  style={inputStyle}
                                />
                                <button className='btn-accion verde' style={{ fontSize: '12px' }} onClick={() => actualizarTurno(t.id)}>Guardar</button>
                                <button className='btn-accion gris' style={{ fontSize: '12px' }} onClick={() => setEditForm(p => { const n={...p}; delete n[t.id]; return n; })}>Cancelar</button>
                              </>
                            ) : (
                              <>
                                <span style={{ background: '#e3f2fd', color: '#1565c0', borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: '500' }}>
                                  {t.hora_inicio} — {t.hora_fin}
                                </span>
                                {!readonly && (
                                  <>
                                    <button className='btn-accion gris' style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => abrirEdicion(t)}>Editar</button>
                                    <button className='btn-accion rojo' style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => eliminarTurno(t.id)}>Quitar</button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        ))}

                        {!readonly && formAdd && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <input type="time" value={formAdd.hora_inicio}
                              onChange={e => setAddForm(p => ({ ...p, [fecha]: { ...p[fecha], hora_inicio: e.target.value } }))}
                              style={inputStyle}
                            />
                            <span style={{ color: '#aaa' }}>—</span>
                            <input type="time" value={formAdd.hora_fin}
                              onChange={e => setAddForm(p => ({ ...p, [fecha]: { ...p[fecha], hora_fin: e.target.value } }))}
                              style={inputStyle}
                            />
                            <button className='btn-accion verde' style={{ fontSize: '12px' }} onClick={() => agregarTurno(fecha)}>Guardar</button>
                            <button className='btn-accion gris' style={{ fontSize: '12px' }} onClick={() => setAddForm(p => { const n={...p}; delete n[fecha]; return n; })}>Cancelar</button>
                          </div>
                        )}

                        {listaTurnos.length === 0 && !formAdd && readonly && (
                          <span style={{ color: '#ccc', fontSize: '13px' }}>Sin turno</span>
                        )}
                      </div>
                    </td>
                    {!readonly && (
                      <td style={{ paddingTop: '10px' }}>
                        {!formAdd && (
                          <button className='btn-accion gris' style={{ fontSize: '12px' }} onClick={() => abrirAgregar(fecha)}>
                            + Turno
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
