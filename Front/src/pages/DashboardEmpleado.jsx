import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "/src/assets/logo.png";
import API_URL, { apiFetch } from '../controller/api';
import HorariosDias    from '../components/HorariosDias';
import HorarioMes      from '../components/HorarioMes';
import HorarioAño      from '../components/HorarioAño';
import HorarioTotal    from '../components/HorarioTotal';
import TurnosEmpleado  from '../components/TurnosEmpleado';
import '../styles/Dashboard.css';

function DashboardEmpleado() {
    const navigate = useNavigate();

    const nombre = localStorage.getItem('nombre') || 'Empleado';
    const dni    = localStorage.getItem('dni') || '';

    const [seccion, setSeccion]     = useState('jornada');
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [trabajando, setTrabajando] = useState(false);
    const [horaActual, setHoraActual] = useState('');
    const [horasHoy, setHorasHoy]     = useState(null);
    const [cargando, setCargando]     = useState(true);

    // Pestaña del panel de horas
    const [vistaHoras, setVistaHoras]     = useState('dia');
    const [filtroHoras, setFiltroHoras]   = useState('');

    // Incidencias
    const [misIncidencias, setMisIncidencias] = useState([]);
    const [nuevaInc, setNuevaInc]             = useState({ tipo: 'otro', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
    const [incMsg, setIncMsg]                 = useState('');
    const [incError, setIncError]             = useState('');

    // Reloj en tiempo real
    useEffect(() => {
        const tick = setInterval(() => {
            setHoraActual(new Date().toTimeString().slice(0, 5));
        }, 1000);
        return () => clearInterval(tick);
    }, []);

    // Estado trabajando
    useEffect(() => {
        if (!dni) return;
        apiFetch(`${API_URL}/usuarios/${dni}/trabajando`)
            .then(r => r.json())
            .then(data => setTrabajando(data.trabajando))
            .finally(() => setCargando(false));
    }, [dni]);

    // Incidencias propias
    useEffect(() => {
        if (seccion !== 'incidencias' || !dni) return;
        apiFetch(`${API_URL}/incidencias/usuario/${dni}`)
            .then(r => r.json()).then(setMisIncidencias).catch(() => {});
    }, [seccion, dni]);

    async function enviarIncidencia(e) {
        e.preventDefault();
        setIncMsg(''); setIncError('');
        if (!nuevaInc.descripcion.trim()) { setIncError('La descripcion es obligatoria'); return; }
        const res = await apiFetch(`${API_URL}/incidencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...nuevaInc, dni_usuario: dni }),
        });
        if (res.ok) {
            setIncMsg('Incidencia enviada correctamente');
            setNuevaInc({ tipo: 'otro', descripcion: '', fecha: new Date().toISOString().slice(0,10) });
            apiFetch(`${API_URL}/incidencias/usuario/${dni}`).then(r => r.json()).then(setMisIncidencias);
        } else {
            const d = await res.json();
            setIncError(d.error || 'Error al enviar');
        }
    }

    // Horas trabajadas hoy
    useEffect(() => {
        if (!dni) return;
        apiFetch(`${API_URL}/jornadas/horas/${dni}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setHorasHoy(data.horas_trabajadas); })
            .catch(() => {});
    }, [dni, trabajando]);
    //Aqui se elimina todos los tokens excepto el de qr
    const cerrarSesion = () => {
        ['token', 'nombre', 'rol', 'dni', 'adminId', 'email'].forEach(k => localStorage.removeItem(k));
        navigate('/IniciarSesion');
    };

    const fecha = new Date();
    const fechaFormato = `${fecha.getDate().toString().padStart(2,'0')} / ${(fecha.getMonth()+1).toString().padStart(2,'0')} / ${fecha.getFullYear()}`;

    return (
        <article className='dashboard'>
            <aside className={`dashboard-sidebar${menuAbierto ? ' menu-abierto' : ''}`}>
                <img src={logo} alt="Fragola" className='logo' />
                <div className='sidebar-info'>
                    <p className='sidebar-nombre'>{nombre}</p>
                    <span className='sidebar-rol rol-empleado'>Empleado</span>
                </div>
                <button className='menu-hamburger' onClick={() => setMenuAbierto(m => !m)}>
                    <span></span><span></span><span></span>
                </button>
                <nav className='sidebar-nav'>
                    <button
                        className={`nav-btn ${seccion === 'jornada' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('jornada'); setMenuAbierto(false); }}
                    >
                        Mi jornada
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'horas' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('horas'); setMenuAbierto(false); }}
                    >
                        Mis horas
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'horario' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('horario'); setMenuAbierto(false); }}
                    >
                        Mi horario
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'incidencias' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('incidencias'); setMenuAbierto(false); }}
                    >
                        Incidencias
                    </button>
                    <button className='btn-cerrar-sesion' onClick={cerrarSesion}>
                        Cerrar sesion
                    </button>
                </nav>
            </aside>
            {menuAbierto && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuAbierto(false)} />}

            <main className='dashboard-main'>
                <p className='dashboard-titulo'>{fechaFormato}</p>

                {/* ── Jornada actual ── */}
                {seccion === 'jornada' && (
                    <>
                        <div className='fichaje-card'>
                            <p className='fichaje-estado'>
                                {cargando
                                    ? 'Cargando...'
                                    : trabajando
                                        ? 'Estas trabajando'
                                        : 'No has fichado entrada'}
                            </p>
                            <p className='fichaje-hora'>{horaActual}</p>
                            <p style={{ color: '#888', fontSize: '14px', marginTop: '12px', textAlign: 'center' }}>
                                Para fichar, escanea el codigo QR en tu puesto de trabajo
                            </p>
                        </div>

                        {horasHoy !== null && (
                            <div className='stats-grid'>
                                <div className='stat-card'>
                                    <span className='stat-valor'>{horasHoy}h</span>
                                    <span className='stat-label'>Horas trabajadas hoy</span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── Incidencias ── */}
                {seccion === 'incidencias' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Incidencias</span>
                        </div>

                        {/* Formulario nueva incidencia */}
                        <form onSubmit={enviarIncidencia} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '440px', marginBottom: '28px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', margin: 0 }}>Nueva incidencia</p>
                            <label style={{ fontSize: '13px', color: '#555' }}>
                                Tipo
                                <select className='input-contraseña'
                                    style={{ display: 'block', marginTop: '4px', padding: '8px 10px' }}
                                    value={nuevaInc.tipo}
                                    onChange={e => setNuevaInc(p => ({ ...p, tipo: e.target.value }))}>
                                    <option value='retraso'>Retraso</option>
                                    <option value='ausencia'>Ausencia</option>
                                    <option value='problema_tecnico'>Problema tecnico</option>
                                    <option value='modificacion_horas'>Solicitud de correccion de horas</option>
                                    <option value='otro'>Otro</option>
                                </select>
                            </label>
                            <label style={{ fontSize: '13px', color: '#555' }}>
                                Fecha
                                <input type='date' className='input-contraseña'
                                    style={{ display: 'block', marginTop: '4px' }}
                                    value={nuevaInc.fecha}
                                    onChange={e => setNuevaInc(p => ({ ...p, fecha: e.target.value }))} />
                            </label>
                            <label style={{ fontSize: '13px', color: '#555' }}>
                                Descripcion
                                <textarea className='input-contraseña'
                                    style={{ display: 'block', marginTop: '4px', resize: 'vertical', minHeight: '80px' }}
                                    placeholder='Explica la incidencia...'
                                    value={nuevaInc.descripcion}
                                    onChange={e => setNuevaInc(p => ({ ...p, descripcion: e.target.value }))} />
                            </label>
                            {incError && <p style={{ color: '#c0392b', fontSize: '13px', margin: 0 }}>{incError}</p>}
                            {incMsg   && <p style={{ color: '#2e7d32', fontSize: '13px', margin: 0 }}>{incMsg}</p>}
                            <button className='btn-accion verde' type='submit' style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
                                Enviar
                            </button>
                        </form>

                        {/* Lista de mis incidencias */}
                        {misIncidencias.length > 0 && (
                            <>
                                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '10px' }}>Mis incidencias</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {misIncidencias.map(inc => (
                                        <div key={inc.id} style={{ padding: '12px 16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                                                    {inc.tipo.replace('_', ' ')} — {inc.fecha}
                                                </span>
                                                <span style={{
                                                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                                                    background: inc.estado === 'resuelta' ? '#e8f5e9' : inc.estado === 'revisada' ? '#fff3e0' : '#fce4ec',
                                                    color:      inc.estado === 'resuelta' ? '#2e7d32' : inc.estado === 'revisada' ? '#e65100' : '#c0392b',
                                                }}>
                                                    {inc.estado}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{inc.descripcion}</p>
                                            {inc.respuesta_admin && (
                                                <p style={{ fontSize: '13px', color: '#2e7d32', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #eee' }}>
                                                    <strong>Respuesta del administrador:</strong> {inc.respuesta_admin}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Mis horas ── */}
                {seccion === 'horas' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Mis horas</span>
                        </div>

                        {/* Navegacion dia / mes / ano / total */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            {['dia', 'mes', 'ano', 'total'].map(v => (
                                <button
                                    key={v}
                                    className={`btn-accion ${vistaHoras === v ? 'verde' : 'gris'}`}
                                    onClick={() => { setVistaHoras(v); setFiltroHoras(''); }}
                                >
                                    {v === 'dia' ? 'Dia' : v === 'mes' ? 'Mes' : v === 'ano' ? 'Ano' : 'Total'}
                                </button>
                            ))}
                        </div>

                        {/* Input de fecha segun vista */}
                        {vistaHoras === 'dia' && (
                            <input type='date' className='input-contraseña'
                                style={{ maxWidth: '200px', marginBottom: '16px' }}
                                onChange={e => setFiltroHoras(e.target.value)} />
                        )}
                        {vistaHoras === 'mes' && (
                            <input type='month' className='input-contraseña'
                                style={{ maxWidth: '200px', marginBottom: '16px' }}
                                onChange={e => setFiltroHoras(e.target.value)} />
                        )}
                        {vistaHoras === 'ano' && (
                            <input type='number' className='input-contraseña'
                                style={{ maxWidth: '120px', marginBottom: '16px' }}
                                placeholder='YYYY' min='2000' max='2100'
                                onChange={e => setFiltroHoras(e.target.value)} />
                        )}

                        {/* Componente correspondiente */}
                        {vistaHoras === 'dia'   && filtroHoras && <HorariosDias data={filtroHoras} dni={dni} nombre={nombre} />}
                        {vistaHoras === 'mes'   && filtroHoras && <HorarioMes   data={filtroHoras} dni={dni} nombre={nombre} />}
                        {vistaHoras === 'ano'   && filtroHoras && <HorarioAño   data={filtroHoras} dni={dni} nombre={nombre} />}
                        {vistaHoras === 'total'                && <HorarioTotal                    dni={dni} nombre={nombre} />}
                    </div>
                )}

                {seccion === 'horario' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <p className='seccion-titulo'>Mi horario</p>
                        </div>
                        <TurnosEmpleado readonly={true} dniEmpleado={dni} />
                    </div>
                )}
            </main>
        </article>
    );
}

export default DashboardEmpleado;
