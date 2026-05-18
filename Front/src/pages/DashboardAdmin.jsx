import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from "/src/assets/logo.png";
import { fetchEmpleados, deleteEmpleado } from '../controller/empleados';
import API_URL, { apiFetch } from '../controller/api';
import HorariosDias     from '../components/HorariosDias';
import HorarioMes       from '../components/HorarioMes';
import HorarioAño       from '../components/HorarioAño';
import HorarioTotal     from '../components/HorarioTotal';
import TurnosEmpleado   from '../components/TurnosEmpleado';
import '../styles/Dashboard.css';

function DashboardAdmin() {
    const navigate = useNavigate();
    const nombre = localStorage.getItem('nombre') || 'Admin';
    const email  = localStorage.getItem('email')  || '';

    const [empleados, setEmpleados]   = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState('');
    const [seccion, setSeccion]       = useState('empleados');
    const [menuAbierto, setMenuAbierto] = useState(false);

    // Empleados - acciones
    const [confirmBaja, setConfirmBaja]     = useState(null);
    const [resetMsg, setResetMsg]           = useState({});

    // Empleados inactivos
    const [inactivos, setInactivos]         = useState([]);
    const [mostrarInactivos, setMostrarInactivos] = useState(false);

    // Fichar manual
    const [ficharDni, setFicharDni]         = useState('');
    const [ficharTipo, setFicharTipo]       = useState('entrada');
    const [ficharMsg, setFicharMsg]         = useState('');
    const [ficharError, setFicharError]     = useState('');

    // Dispositivos
    const [dispositivos, setDispositivos]   = useState([]);

    // Configuracion
    const [config, setConfig]               = useState(null);
    const [configGuardado, setConfigGuardado] = useState(false);
    const [backupMsg, setBackupMsg]         = useState('');
    const [backupError, setBackupError]     = useState('');


    // Vista de horas inline
    const [vistaHoras, setVistaHoras]   = useState('dia');
    const [filtroHoras, setFiltroHoras] = useState('');

    // Incidencias
    const [incidencias, setIncidencias]         = useState([]);
    const [incExpanded, setIncExpanded]         = useState(null);
    const [incRespuesta, setIncRespuesta]       = useState({});
    const [incEstado, setIncEstado]             = useState({});
    const [incMsg, setIncMsg]                   = useState('');

    // Auditoria
    const [auditoria, setAuditoria]             = useState([]);

    // Puestos
    const [puestos, setPuestos]                 = useState([]);
    const [nuevoPuesto, setNuevoPuesto]         = useState('');
    const [puestosMsg, setPuestosMsg]           = useState('');
    const [puestosError, setPuestosError]       = useState('');

    // Cargar empleados — siempre activo
    const cargarEmpleados = () =>
        fetchEmpleados()
            .then(data => { setEmpleados(data); setCargando(false); })
            .catch(() => { setError('No se pudo cargar la lista de empleados'); setCargando(false); });

    useEffect(() => {
        cargarEmpleados();
        const iv = setInterval(cargarEmpleados, 30000);
        return () => clearInterval(iv);
    }, []);

    // Config — solo al entrar en esa sección
    useEffect(() => {
        if (seccion !== 'configuracion') return;
        apiFetch(`${API_URL}/config`).then(r => r.json()).then(setConfig);
    }, [seccion]);

    // Dispositivos — solo al entrar en esa sección
    useEffect(() => {
        if (seccion !== 'dispositivos') return;
        apiFetch(`${API_URL}/dispositivos`).then(r => r.json()).then(setDispositivos);
    }, [seccion]);

    // Auditoria — solo al entrar en esa sección
    useEffect(() => {
        if (seccion !== 'auditoria') return;
        apiFetch(`${API_URL}/auditoria`).then(r => r.json()).then(setAuditoria);
    }, [seccion]);

    // Puestos — solo al entrar en esa sección
    useEffect(() => {
        if (seccion !== 'puestos') return;
        apiFetch(`${API_URL}/puestos`).then(r => r.json()).then(setPuestos);
    }, [seccion]);

    // Incidencias — solo al entrar en esa sección
    useEffect(() => {
        if (seccion !== 'incidencias') return;
        apiFetch(`${API_URL}/incidencias`).then(r => r.json()).then(data => {
            setIncidencias(data);
            const r = {}, e = {};
            data.forEach(i => { r[i.id] = i.respuesta_admin || ''; e[i.id] = i.estado; });
            setIncRespuesta(r);
            setIncEstado(e);
        });
    }, [seccion]);

    const handleReactivar = async (dni) => {
        await apiFetch(`${API_URL}/usuarios/${dni}/reactivar`, { method: 'PUT' });
        setInactivos(prev => prev.filter(e => e.dni !== dni));
        cargarEmpleados();
    };

    const cargarInactivos = () =>
        apiFetch(`${API_URL}/usuarios/inactivos/lista`)
            .then(r => r.json()).then(setInactivos);

    const handleBaja = async (dni) => {
        try {
            await deleteEmpleado(dni);
            setEmpleados(prev => prev.filter(e => e.dni !== dni));
            setConfirmBaja(null);
        } catch {
            setError('Error al dar de baja al empleado');
        }
    };

    // ── Reset contraseña ──
    const handleResetPassword = async (dni) => {
        setResetMsg(prev => ({ ...prev, [dni]: null }));
        try {
            const res = await apiFetch(`${API_URL}/sesion/reset-password/${dni}`, { method: 'POST' });
            const data = await res.json();
            setResetMsg(prev => ({ ...prev, [dni]: { ok: res.ok, text: data.message } }));
            setTimeout(() => setResetMsg(prev => ({ ...prev, [dni]: null })), 4000);
        } catch {
            setResetMsg(prev => ({ ...prev, [dni]: { ok: false, text: 'Error de conexion' } }));
        }
    };

    // ── Fichar manual ──
    const handleFicharManual = async (e) => {
        e.preventDefault();
        setFicharMsg('');
        setFicharError('');
        try {
            const res = await apiFetch(`${API_URL}/jornadas/fichar-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: ficharDni, tipo: ficharTipo }),
            });
            const data = await res.json();
            if (res.ok) {
                setFicharMsg(`${ficharTipo === 'entrada' ? 'Entrada' : 'Salida'} registrada a las ${data.hora}`);
                cargarEmpleados();
            } else {
                setFicharError(data.error || 'Error al fichar');
            }
        } catch {
            setFicharError('Error de conexion');
        }
    };

    // ── Estado dispositivo ──
    const handleDeviceEstado = async (id, estado) => {
        await apiFetch(`${API_URL}/dispositivos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado }),
        });
        setDispositivos(prev => prev.map(d => d.id === id ? { ...d, estado } : d));
    };

    // ── Guardar config ──
    async function guardarConfig(e) {
        e.preventDefault();
        await apiFetch(`${API_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        setConfigGuardado(true);
        setTimeout(() => setConfigGuardado(false), 3000);
    }

    // ── Responder incidencia ──
    const handleResponderIncidencia = async (id) => {
        const adminId = localStorage.getItem('adminId');
        const res = await apiFetch(`${API_URL}/incidencias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: incEstado[id], respuesta_admin: incRespuesta[id], admin_id: adminId }),
        });
        if (res.ok) {
            setIncMsg('Incidencia actualizada');
            setIncExpanded(null);
            setTimeout(() => setIncMsg(''), 3000);
            setIncidencias(prev => prev.map(i => i.id === id ? { ...i, estado: incEstado[id], respuesta_admin: incRespuesta[id] } : i));
        }
    };

    // ── Backup ──
    const handleBackup = async () => {
        setBackupMsg('');
        setBackupError('');
        try {
            const res = await apiFetch(`${API_URL}/config/backup`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) setBackupMsg(data.message);
            else setBackupError(data.message || 'Error al generar backup');
        } catch {
            setBackupError('Error de conexion');
        }
    };

    // ── Puestos ──
    const handleCrearPuesto = async (e) => {
        e.preventDefault();
        setPuestosMsg(''); setPuestosError('');
        const res = await apiFetch(`${API_URL}/puestos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoPuesto }),
        });
        const data = await res.json();
        if (res.ok) {
            setPuestos(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            setNuevoPuesto('');
            setPuestosMsg('Puesto creado');
            setTimeout(() => setPuestosMsg(''), 3000);
        } else {
            setPuestosError(data.error || 'Error al crear puesto');
        }
    };

    const handleEliminarPuesto = async (id) => {
        const res = await apiFetch(`${API_URL}/puestos/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setPuestos(prev => prev.filter(p => p.id !== id));
        }
    };

    const cerrarSesion = () => {
        ['token', 'nombre', 'rol', 'dni', 'adminId', 'email'].forEach(k => localStorage.removeItem(k));
        navigate('/IniciarSesion');
    };

    const trabajandoAhora = empleados.filter(e => e.trabajando);

    return (
        <article className='dashboard'>
            <aside className={`dashboard-sidebar${menuAbierto ? ' menu-abierto' : ''}`}>
                <img src={logo} alt="Fragola" className='logo' />
                <div className='sidebar-info'>
                    <p className='sidebar-nombre'>{nombre}</p>
                    <span className='sidebar-rol rol-admin'>Administrador</span>
                </div>
                <button className='menu-hamburger' onClick={() => setMenuAbierto(m => !m)}>
                    <span></span><span></span><span></span>
                </button>
                <nav className='sidebar-nav'>
                    <button
                        className={`nav-btn ${seccion === 'empleados' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('empleados'); setMenuAbierto(false); }}
                    >
                        Empleados
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'fichar' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('fichar'); setMenuAbierto(false); }}
                    >
                        Fichar por empleado
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'dispositivos' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('dispositivos'); setMenuAbierto(false); }}
                    >
                        Dispositivos
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'configuracion' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('configuracion'); setMenuAbierto(false); }}
                    >
                        Configuracion
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'incidencias' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('incidencias'); setMenuAbierto(false); }}
                    >
                        Incidencias
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'horas' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('horas'); setMenuAbierto(false); }}
                    >
                        Horas empleados
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'turnos' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('turnos'); setMenuAbierto(false); }}
                    >
                        Turnos
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'auditoria' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('auditoria'); setMenuAbierto(false); }}
                    >
                        Auditoria
                    </button>
                    <button
                        className={`nav-btn ${seccion === 'puestos' ? 'activo' : ''}`}
                        onClick={() => { setSeccion('puestos'); setMenuAbierto(false); }}
                    >
                        Puestos
                    </button>
                    <button className='btn-cerrar-sesion' onClick={cerrarSesion}>
                        Cerrar sesion
                    </button>
                </nav>
            </aside>
            {menuAbierto && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuAbierto(false)} />}

            <main className='dashboard-main'>
                <p className='dashboard-titulo'>Panel de administracion</p>

                <div className='stats-grid'>
                    <div className='stat-card'>
                        <span className='stat-valor'>{empleados.length}</span>
                        <span className='stat-label'>Total empleados</span>
                    </div>
                    <div className='stat-card'>
                        <span className='stat-valor'>{trabajandoAhora.length}</span>
                        <span className='stat-label'>Trabajando ahora</span>
                    </div>
                </div>

                {error && <p className='error-message' style={{ marginBottom: '16px' }}>{error}</p>}

                {/* ── Empleados ── */}
                {seccion === 'empleados' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Lista de empleados</span>
                            <button className='btn-accion verde' onClick={() => navigate('/AgregarEmpleado')}>
                                + Anadir empleado
                            </button>
                        </div>
                        {cargando ? (
                            <p style={{ color: '#888' }}>Cargando...</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className='tabla'>
                                    <thead>
                                        <tr>
                                            <th>DNI</th>
                                            <th>Nombre</th>
                                            <th>Puesto</th>
                                            <th>Email</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {empleados.map(emp => (
                                            <tr key={emp.dni}>
                                                <td>{emp.dni}</td>
                                                <td>{emp.nombre_completo}</td>
                                                <td>{emp.puesto || '—'}</td>
                                                <td>{emp.email || '—'}</td>
                                                <td>
                                                    <span className={`badge-trabajando ${emp.trabajando ? 'si' : 'no'}`}>
                                                        {emp.trabajando ? 'Trabajando' : 'Fuera'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        <button
                                                            className='btn-accion gris'
                                                            onClick={() => navigate(`/editar/${emp.dni}`)}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            className='btn-accion gris'
                                                            onClick={() => handleResetPassword(emp.dni)}
                                                        >
                                                            Reset contrasena
                                                        </button>
                                                        {confirmBaja === emp.dni ? (
                                                            <>
                                                                <button className='btn-accion rojo' onClick={() => handleBaja(emp.dni)}>
                                                                    Confirmar
                                                                </button>
                                                                <button className='btn-accion gris' onClick={() => setConfirmBaja(null)}>
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button className='btn-accion rojo' onClick={() => setConfirmBaja(emp.dni)}>
                                                                Dar de baja
                                                            </button>
                                                        )}
                                                        {resetMsg[emp.dni] && (
                                                            <span style={{
                                                                fontSize: '12px',
                                                                color: resetMsg[emp.dni].ok ? '#2e7d32' : '#c0392b'
                                                            }}>
                                                                {resetMsg[emp.dni].text}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Empleados inactivos */}
                        <div style={{ marginTop: '24px' }}>
                            <button
                                className='btn-accion gris'
                                onClick={() => { setMostrarInactivos(v => !v); if (!mostrarInactivos) cargarInactivos(); }}
                            >
                                {mostrarInactivos ? 'Ocultar dados de baja' : 'Ver empleados dados de baja'}
                            </button>
                            {mostrarInactivos && inactivos.length === 0 && (
                                <p style={{ color: '#aaa', fontSize: '13px', marginTop: '12px' }}>No hay empleados dados de baja.</p>
                            )}
                            {mostrarInactivos && inactivos.length > 0 && (
                                <table className='tabla' style={{ marginTop: '12px' }}>
                                    <thead>
                                        <tr>
                                            <th>DNI</th>
                                            <th>Nombre</th>
                                            <th>Puesto</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inactivos.map(emp => (
                                            <tr key={emp.dni}>
                                                <td>{emp.dni}</td>
                                                <td>{emp.nombre_completo}</td>
                                                <td>{emp.puesto || '—'}</td>
                                                <td>
                                                    <button className='btn-accion verde' onClick={() => handleReactivar(emp.dni)}>
                                                        Reactivar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Fichar manual ── */}
                {seccion === 'fichar' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Fichar por un empleado</span>
                        </div>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            Usa esto cuando un empleado no pueda fichar con su movil.
                        </p>
                        <form onSubmit={handleFicharManual} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '400px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                                Empleado
                                <select
                                    value={ficharDni}
                                    onChange={e => setFicharDni(e.target.value)}
                                    required
                                    style={{
                                        display: 'block', marginTop: '6px', width: '100%',
                                        padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px',
                                        fontSize: '14px', background: 'white'
                                    }}
                                >
                                    <option value=''>Selecciona un empleado</option>
                                    {empleados.map(e => (
                                        <option key={e.dni} value={e.dni}>
                                            {e.nombre_completo} ({e.trabajando ? 'Trabajando' : 'Fuera'})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                                Tipo de fichaje
                                <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'normal', cursor: 'pointer' }}>
                                        <input type='radio' name='tipo' value='entrada'
                                            checked={ficharTipo === 'entrada'} onChange={() => setFicharTipo('entrada')} />
                                        Entrada
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'normal', cursor: 'pointer' }}>
                                        <input type='radio' name='tipo' value='salida'
                                            checked={ficharTipo === 'salida'} onChange={() => setFicharTipo('salida')} />
                                        Salida
                                    </label>
                                </div>
                            </label>
                            {ficharError && <p style={{ color: '#c0392b', fontSize: '13px', margin: 0 }}>{ficharError}</p>}
                            {ficharMsg   && <p style={{ color: '#2e7d32', fontSize: '13px', margin: 0 }}>{ficharMsg}</p>}
                            <button className='btn-accion verde' type='submit' style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
                                Registrar fichaje
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Dispositivos ── */}
                {seccion === 'dispositivos' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Dispositivos vinculados</span>
                        </div>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                            Cuando un empleado ficha desde un movil nuevo, aparece aqui como pendiente.
                            Aprueba el dispositivo para permitirle fichar, o revocalo para bloquearlo.
                        </p>
                        {dispositivos.length === 0 ? (
                            <p style={{ color: '#888' }}>No hay dispositivos registrados.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className='tabla'>
                                    <thead>
                                        <tr>
                                            <th>Empleado</th>
                                            <th>Dispositivo</th>
                                            <th>Estado</th>
                                            <th>Fecha solicitud</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dispositivos.map(d => (
                                            <tr key={d.id}>
                                                <td>{d.nombre_completo}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#888' }}>
                                                    {d.device_id.slice(0, 16)}...
                                                </td>
                                                <td>
                                                    <span className='badge-trabajando'
                                                        style={{
                                                            background: d.estado === 'vinculado' ? '#e8f5e9' :
                                                                        d.estado === 'revocado'  ? '#f5f5f5' : '#fff3e0',
                                                            color:      d.estado === 'vinculado' ? '#2e7d32' :
                                                                        d.estado === 'revocado'  ? '#999'    : '#e65100'
                                                        }}
                                                    >
                                                        {d.estado}
                                                    </span>
                                                </td>
                                                <td>{new Date(d.fecha_solicitud).toLocaleDateString()}</td>
                                                <td style={{ display: 'flex', gap: '6px' }}>
                                                    {d.estado !== 'vinculado' && (
                                                        <button className='btn-accion verde'
                                                            onClick={() => handleDeviceEstado(d.id, 'vinculado')}>
                                                            Aprobar
                                                        </button>
                                                    )}
                                                    {d.estado !== 'revocado' && (
                                                        <button className='btn-accion rojo'
                                                            onClick={() => handleDeviceEstado(d.id, 'revocado')}>
                                                            Revocar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Horas empleados ── */}
                {seccion === 'horas' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Horas empleados</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            {['dia', 'mes', 'ano', 'total'].map(v => (
                                <button key={v}
                                    className={`btn-accion ${vistaHoras === v ? 'verde' : 'gris'}`}
                                    onClick={() => { setVistaHoras(v); setFiltroHoras(''); }}>
                                    {v === 'dia' ? 'Dia' : v === 'mes' ? 'Mes' : v === 'ano' ? 'Ano' : 'Total'}
                                </button>
                            ))}
                        </div>
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
                        {vistaHoras === 'dia'   && filtroHoras && <HorariosDias data={filtroHoras} editable={true} adminId={localStorage.getItem('adminId')} />}
                        {vistaHoras === 'mes'   && filtroHoras && <HorarioMes   data={filtroHoras} />}
                        {vistaHoras === 'ano'   && filtroHoras && <HorarioAño   data={filtroHoras} />}
                        {vistaHoras === 'total'              && <HorarioTotal />}
                    </div>
                )}

                {/* ── Incidencias ── */}
                {seccion === 'incidencias' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Incidencias</span>
                        </div>
                        {incMsg && <p style={{ color: '#2e7d32', fontSize: '13px', marginBottom: '12px' }}>{incMsg}</p>}
                        {incidencias.length === 0 ? (
                            <p style={{ color: '#888' }}>No hay incidencias registradas.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className='tabla'>
                                    <thead>
                                        <tr>
                                            <th>Empleado</th>
                                            <th>Tipo</th>
                                            <th>Fecha</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {incidencias.map(inc => (
                                            <React.Fragment key={inc.id}>
                                                <tr>
                                                    <td>{inc.nombre_completo}</td>
                                                    <td>{inc.tipo.replace('_', ' ')}</td>
                                                    <td>{inc.fecha}</td>
                                                    <td>
                                                        <span className='badge-trabajando'
                                                            style={{
                                                                background: inc.estado === 'resuelta' ? '#e8f5e9' : inc.estado === 'revisada' ? '#fff3e0' : '#fce4ec',
                                                                color:      inc.estado === 'resuelta' ? '#2e7d32' : inc.estado === 'revisada' ? '#e65100' : '#c0392b',
                                                            }}>
                                                            {inc.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className='btn-accion gris'
                                                            onClick={() => setIncExpanded(incExpanded === inc.id ? null : inc.id)}>
                                                            {incExpanded === inc.id ? 'Cerrar' : 'Ver / Responder'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {incExpanded === inc.id && (
                                                    <tr>
                                                        <td colSpan={5} style={{ background: '#fafafa', padding: '12px 16px' }}>
                                                            <p style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>
                                                                <strong>Descripcion:</strong> {inc.descripcion}
                                                            </p>
                                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                                                <label style={{ fontSize: '13px', color: '#555' }}>
                                                                    Estado
                                                                    <select className='input-contraseña'
                                                                        style={{ display: 'block', marginTop: '4px', padding: '6px 10px' }}
                                                                        value={incEstado[inc.id] || inc.estado}
                                                                        onChange={e => setIncEstado(prev => ({ ...prev, [inc.id]: e.target.value }))}>
                                                                        <option value='pendiente'>Pendiente</option>
                                                                        <option value='revisada'>Revisada</option>
                                                                        <option value='resuelta'>Resuelta</option>
                                                                    </select>
                                                                </label>
                                                                <label style={{ fontSize: '13px', color: '#555', flex: 1, minWidth: '200px' }}>
                                                                    Respuesta
                                                                    <input type='text' className='input-contraseña'
                                                                        style={{ display: 'block', marginTop: '4px' }}
                                                                        placeholder='Escribe una respuesta al empleado...'
                                                                        value={incRespuesta[inc.id] ?? ''}
                                                                        onChange={e => setIncRespuesta(prev => ({ ...prev, [inc.id]: e.target.value }))} />
                                                                </label>
                                                                <button className='btn-accion verde'
                                                                    style={{ padding: '8px 18px', alignSelf: 'flex-end' }}
                                                                    onClick={() => handleResponderIncidencia(inc.id)}>
                                                                    Guardar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Configuracion ── */}
                {seccion === 'configuracion' && config && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Configuracion del sistema</span>
                        </div>
                        <form onSubmit={guardarConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>
                                URL publica del servidor
                                <p style={{ fontWeight: 'normal', color: '#888', fontSize: '12px', marginBottom: '4px' }}>
                                    La direccion desde donde los moviles acceden a la app. Se usa en el QR de fichaje.
                                </p>
                                <input
                                    className='input-contraseña'
                                    type='url'
                                    placeholder='https://fichador.miempresa.com'
                                    value={config.server_url || ''}
                                    onChange={e => setConfig({ ...config, server_url: e.target.value })}
                                />
                            </label>
                            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginTop: '4px' }}>
                                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '10px' }}>
                                    Correo SMTP
                                </p>
                            </div>
                            {[
                                { clave: 'smtp_host',      label: 'Servidor SMTP',               placeholder: 'smtp.gmail.com' },
                                { clave: 'smtp_port',      label: 'Puerto',                       placeholder: '587' },
                                { clave: 'smtp_user',      label: 'Email de envio',               placeholder: 'tucorreo@gmail.com' },
                                { clave: 'smtp_pass',      label: 'Contrasena de aplicacion',     placeholder: 'abcd efgh ijkl mnop', type: 'password' },
                                { clave: 'email_destino',  label: 'Email que recibe los backups', placeholder: 'jefe@empresa.com' },
                            ].map(({ clave, label, placeholder, type }) => (
                                <label key={clave} style={{ fontSize: '13px', color: '#555' }}>
                                    {label}
                                    <input
                                        className='input-contraseña'
                                        type={type || 'text'}
                                        placeholder={placeholder}
                                        value={config[clave] || ''}
                                        onChange={e => setConfig({ ...config, [clave]: e.target.value })}
                                        style={{ marginTop: '4px', marginBottom: '8px' }}
                                    />
                                </label>
                            ))}
                            <button className='btn-accion rojo' type='submit'>
                                Guardar
                            </button>
                            {configGuardado && (
                                <p style={{ color: '#2e7d32', fontSize: '13px' }}>Configuracion guardada</p>
                            )}
                        </form>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '24px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
                                Copia de seguridad
                            </p>
                            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                                Genera una copia de seguridad de la base de datos y la envia al email de destino configurado arriba.
                            </p>
                            <button className='btn-accion gris' onClick={handleBackup}
                                style={{ padding: '10px 24px' }}>
                                Enviar copia de seguridad
                            </button>
                            {backupMsg   && <p style={{ color: '#2e7d32', fontSize: '13px', marginTop: '8px' }}>{backupMsg}</p>}
                            {backupError && <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '8px' }}>{backupError}</p>}
                        </div>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '24px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '6px' }}>
                                Cambio de contrasena
                            </p>
                            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
                                Se enviara un codigo de verificacion al email de tu cuenta de administrador.
                            </p>
                            <button className='btn-accion rojo' onClick={() => navigate('/admin-cambiar-password')}
                                style={{ padding: '10px 24px' }}>
                                Cambiar contrasena
                            </button>
                        </div>
                    </div>
                )}

                {seccion === 'turnos' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <p className='seccion-titulo'>Turnos del mes</p>
                        </div>
                        <TurnosEmpleado adminId={localStorage.getItem('adminId')} />
                    </div>
                )}

                {seccion === 'auditoria' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <p className='seccion-titulo'>Registro de auditoria</p>
                            <span style={{ fontSize: '12px', color: '#aaa' }}>Solo lectura — no modificable</span>
                        </div>
                        {auditoria.length === 0 ? (
                            <p style={{ color: '#aaa', fontSize: '14px' }}>Sin registros</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className='tabla'>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Actor</th>
                                            <th>ID actor</th>
                                            <th>Accion</th>
                                            <th>Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditoria.map(r => (
                                            <tr key={r.id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(r.created_at).toLocaleString('es-ES')}
                                                </td>
                                                <td>{r.actor_tipo}</td>
                                                <td>{r.actor_id}</td>
                                                <td>{r.accion}</td>
                                                <td style={{ maxWidth: '300px', wordBreak: 'break-word' }}>{r.detalle}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                {seccion === 'puestos' && (
                    <div className='seccion'>
                        <div className='seccion-header'>
                            <span className='seccion-titulo'>Puestos de trabajo</span>
                        </div>

                        <form onSubmit={handleCrearPuesto} style={{ display: 'flex', gap: '8px', marginBottom: '20px', maxWidth: '400px' }}>
                            <input
                                className='input-contraseña'
                                placeholder='Nombre del puesto'
                                value={nuevoPuesto}
                                onChange={e => setNuevoPuesto(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            />
                            <button className='btn-accion verde' type='submit'>Anadir</button>
                        </form>

                        {puestosMsg   && <p style={{ color: '#2e7d32', fontSize: '13px', marginBottom: '12px' }}>{puestosMsg}</p>}
                        {puestosError && <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{puestosError}</p>}

                        {puestos.length === 0 ? (
                            <p style={{ color: '#888' }}>No hay puestos definidos.</p>
                        ) : (
                            <table className='tabla' style={{ maxWidth: '400px' }}>
                                <thead>
                                    <tr>
                                        <th>Puesto</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {puestos.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.nombre}</td>
                                            <td>
                                                <button className='btn-accion rojo' onClick={() => handleEliminarPuesto(p.id)}>
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

            </main>
        </article>
    );
}

export default DashboardAdmin;
