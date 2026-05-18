import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import API_URL, { apiFetch } from '../controller/api';
import logo from '/src/assets/logo.png';
import '../styles/IniciarSesion.css';

/* Aqui se coge el id que esta almacenado en el dispositivo, en caso de que no existe id en el dispositivo se 
crea uno nuevo, ademas dentro de este if hay otro if de por si acaso en el navegador no funcione el <crypto className="randomUUId"></crypto>
en mi caso siempre a funcionado pero se puede dar la ocasion sobre todo en moviles mas antiguos de que no funcione,
si este no funciona  se genera el numeor con Math.random*/
function getOrCreateDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('device_id', id);
    }
    return id;
}

function Fichar() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token     = searchParams.get('t');
    const userDni   = localStorage.getItem('dni');
    const nombre    = localStorage.getItem('nombre');
    const rol       = localStorage.getItem('rol');
    const authToken = localStorage.getItem('token');

    const [resultado, setResultado] = useState(null);
    const [error, setError]         = useState('');
    const [cargando, setCargando]   = useState(false);
    //Si no tiene sesion iniciada, hay un return al inicio de sesion con un redirect al fichaje
    if (!authToken) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        return <Navigate to={`/IniciarSesion?redirect=${redirect}`} replace />;
    }
    //EN caso de que la cuenta con la que se haya inciado sesion sea de adminstrador, lo mando al dashborad de admin
    //Ya que un adminstrador puede tener cuenta con rol de usuario para fichar y otra con rol de adminstrador 
    if (rol !== 'empleado') {
        return <Navigate to='/admin' replace />;
    }
    //Si no encuentra el parametro del qr, es que es un qr no valido
    if (!token) {
        return (
            <div className='iniciarSesion'>
                <main>
                    <div className='formulario-container'>
                        <div className='formulario-iniciar'>
                            <img className='logo' src={logo} alt="Fragola" />
                            <h2>QR invalido</h2>
                            <p style={{ color: '#888', textAlign: 'center' }}>
                                Este enlace no contiene un codigo QR valido.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }


    //En 
    async function handleFichar() {
        setError('');
        setCargando(true);
        try {
            const device_id = getOrCreateDeviceId();
            const res = await apiFetch(`${API_URL}/jornadas/fichar-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: userDni, qr_token: token, device_id }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Error al fichar');
                return;
            }
            setResultado(data);
        } catch {
            setError('No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    }

    if (resultado) {
        const esEntrada = resultado.accion === 'entrada';
        return (
            <div className='iniciarSesion'>
                <main>
                    <div className='formulario-container'>
                        <div className='formulario-iniciar'>
                            <img className='logo' src={logo} alt="Fragola" style={{ marginBottom: '16px' }} />
                            <h2>{esEntrada ? 'Entrada registrada' : 'Salida registrada'}</h2>
                            <p style={{ color: '#888', textAlign: 'center', marginTop: '8px' }}>
                                {nombre} — {resultado.hora}
                            </p>
                            <button
                                className='boton-iniciar'
                                style={{ marginTop: '24px' }}
                                onClick={() => navigate('/dashboard')}
                            >
                                Ver mi jornada
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className='iniciarSesion'>
            <main>
                <div className='formulario-container'>
                    <div className='formulario-iniciar'>
                        <img className='logo' src={logo} alt="Fragola" style={{ marginBottom: '16px' }} />
                        <h2>Hola, {nombre}</h2>
                        <p style={{ color: '#888', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
                            Estas en el puesto de trabajo. Pulsa el boton para registrar tu fichaje.
                        </p>
                        {error && <p className='error-message' style={{ marginBottom: '16px' }}>{error}</p>}
                        <button className='boton-iniciar' onClick={handleFichar} disabled={cargando}>
                            {cargando ? 'Fichando...' : 'Fichar'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Fichar;
