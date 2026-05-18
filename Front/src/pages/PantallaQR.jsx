import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import API_URL from '../controller/api';
import logo from '/src/assets/logo.png';
import '../styles/Dashboard.css';

const EXPIRY_KEY = 'qr_auth_expiry';
const MS_30_DIAS = 30 * 24 * 60 * 60 * 1000;

function estaAutenticado() {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry && Date.now() < Number(expiry)) return true;
    return !!localStorage.getItem('token');
}

function PantallaQR() {
    const navigate = useNavigate();
    const [autenticado, setAutenticado] = useState(estaAutenticado());

    const [email, setEmail]         = useState('');
    const [password, setPassword]   = useState('');
    const [gateError, setGateError] = useState('');
    const [cargando, setCargando]   = useState(false);

    const [qrToken, setQrToken]       = useState('');
    const [qrCaduca, setQrCaduca]     = useState(null);
    const [serverUrl, setServerUrl]   = useState('');
    const [trabajando, setTrabajando] = useState([]);

    async function verificar(e) {
        e.preventDefault();
        setCargando(true);
        setGateError('');
        try {
            const res = await fetch(`${API_URL}/sesion/login-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                localStorage.setItem(EXPIRY_KEY, String(Date.now() + MS_30_DIAS));
                setAutenticado(true);
            } else {
                setGateError('Credenciales incorrectas');
            }
        } catch {
            setGateError('Error de conexion');
        } finally {
            setCargando(false);
        }
    }

    function cargarQr() {
        fetch(`${API_URL}/sesion/qr-token`)
            .then(r => r.json())
            .then(d => {
                setQrToken(d.token);
                setQrCaduca(d.caduca_en);
                setServerUrl(d.server_url || '');
            })
            .catch(() => {});
    }

    function cargarTrabajando() {
        fetch(`${API_URL}/sesion/trabajando`)
            .then(r => r.json())
            .then(setTrabajando)
            .catch(() => {});
    }

    useEffect(() => {
        if (!autenticado) return;
        cargarQr();
        cargarTrabajando();
        const ivQr   = setInterval(cargarQr,        30000);
        const ivTrab = setInterval(cargarTrabajando, 15000);
        return () => { clearInterval(ivQr); clearInterval(ivTrab); };
    }, [autenticado]);

    if (!autenticado) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: '#f5f5f5',
            }}>
                <div style={{
                    background: 'white', borderRadius: '12px', padding: '40px',
                    width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}>
                    <img src={logo} alt="Fragola" style={{ width: '80px', display: 'block', margin: '0 auto 24px' }} />
                    <p style={{ fontWeight: 'bold', fontSize: '15px', color: '#333', marginBottom: '20px', textAlign: 'center' }}>
                        Acceso a pantalla QR
                    </p>
                    <form onSubmit={verificar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            className='qr-gate-input'
                            type='email'
                            placeholder='Email de administrador'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                        <input
                            className='qr-gate-input'
                            type='password'
                            placeholder='Contrasena'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        {gateError && (
                            <p style={{ color: '#c0392b', fontSize: '13px', margin: 0 }}>{gateError}</p>
                        )}
                        <button
                            type='submit'
                            className='btn-accion verde'
                            disabled={cargando}
                            style={{ padding: '12px', fontSize: '15px', fontWeight: 'bold' }}
                        >
                            {cargando ? 'Verificando...' : 'Entrar'}
                        </button>
                        <button
                            type='button'
                            className='btn-accion gris'
                            style={{ padding: '10px' }}
                            onClick={() => navigate('/IniciarSesion')}
                        >
                            Volver al login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className='qr'>
            <div className='qr-header'>
                <img src={logo} alt="Fragola" className='qr-logo' />
                <p className='qr-titulo'>Sistema de fichaje</p>
            </div>

            <div className='qr-body'>
                <div className='qr-qr-panel'>
                    {!serverUrl ? (
                        <p style={{ color: '#c0392b', fontSize: '14px', textAlign: 'center', maxWidth: '280px' }}>
                            La URL del servidor no esta configurada.
                        </p>
                    ) : qrToken ? (
                        <>
                            <QRCodeSVG
                                value={`${serverUrl}/fichar?t=${qrToken}`}
                                size={280}
                                level="M"
                            />
                            <p className='qr-qr-label'>Escanea con tu movil para fichar</p>
                            {qrCaduca !== null && (
                                <p className='qr-qr-caduca'>
                                    Codigo valido por {Math.ceil(qrCaduca / 60)} min
                                </p>
                            )}
                        </>
                    ) : (
                        <p style={{ color: '#aaa' }}>Cargando codigo QR...</p>
                    )}
                </div>

                <div className='qr-trabajando-panel'>
                    <p className='qr-seccion-titulo'>Trabajando ahora</p>
                    <p className='qr-contador'>
                        {trabajando.length} {trabajando.length === 1 ? 'empleado' : 'empleados'}
                    </p>
                    <div className='qr-lista-trabajando'>
                        {trabajando.length === 0 ? (
                            <p style={{ color: '#bbb', textAlign: 'center', fontSize: '14px', marginTop: '20px' }}>
                                Nadie trabajando en este momento
                            </p>
                        ) : (
                            trabajando.map((emp, i) => (
                                <div key={i} className='qr-empleado-item'>
                                    <span className='qr-empleado-nombre'>{emp.nombre_completo}</span>
                                    {emp.puesto && <span className='qr-empleado-puesto'>{emp.puesto}</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <button className='boton-volver' onClick={() => navigate('/IniciarSesion')}>
                Volver
            </button>
        </div>
    );
}

export default PantallaQR;
