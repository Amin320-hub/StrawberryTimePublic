import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL, { apiFetch } from '../controller/api';
import logo from "/src/assets/logo.png";
import '../styles/IniciarSesion.css';

function CambiarPasswordAdmin() {
    const navigate = useNavigate();

    const [codigoEnviado, setCodigoEnviado] = useState(false);
    const [codigo, setCodigo]               = useState('');
    const [passwordNueva, setPasswordNueva]   = useState('');
    const [passwordRepetir, setPasswordRepetir] = useState('');
    const [error, setError]     = useState('');
    const [cargando, setCargando] = useState(false);

    const handleEnviarCodigo = async () => {
        setError('');
        setCargando(true);
        try {
            const res = await apiFetch(`${API_URL}/config/admin-codigo`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) setCodigoEnviado(true);
            else setError(data.error || 'Error al enviar el codigo');
        } catch {
            setError('No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (passwordNueva !== passwordRepetir) {
            setError('Las contrasenas nuevas no coinciden');
            return;
        }

        if (passwordNueva.length < 6) {
            setError('La contrasena debe tener al menos 6 caracteres');
            return;
        }

        setCargando(true);

        try {
            const res = await apiFetch(`${API_URL}/config/admin-verificar-codigo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo, password_nueva: passwordNueva }),
            });

            const datos = await res.json();

            if (!res.ok) {
                setError(datos.error || 'Error al cambiar la contrasena');
                return;
            }

            navigate('/admin');

        } catch {
            setError('No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    };

    return (
        <article className='iniciarSesion'>
            <main style={{ width: '100%' }}>
                <div className='formulario-container'>
                    {!codigoEnviado ? (
                        <div className='formulario-iniciar'>
                            <img src={logo} alt="Fragola" style={{ width: '80px', marginBottom: '20px' }} />
                            <h2>Cambiar contrasena</h2>
                            <p style={{ color: '#888', marginBottom: '28px', textAlign: 'center', fontSize: '14px' }}>
                                Se enviara un codigo de verificacion al email de tu cuenta de administrador.
                            </p>
                            {error && <p className='error-message' style={{ marginBottom: '16px' }}>{error}</p>}
                            <button className='boton-iniciar' onClick={handleEnviarCodigo} disabled={cargando}>
                                {cargando ? 'Enviando...' : 'Enviar codigo'}
                            </button>
                            <button className='boton-iniciar' type='button'
                                style={{ background: '#e0e0e0', color: '#555', marginTop: '8px' }}
                                onClick={() => navigate('/admin')}>
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className='formulario-iniciar'>
                            <img src={logo} alt="Fragola" style={{ width: '80px', marginBottom: '20px' }} />
                            <h2>Cambiar contrasena</h2>
                            <p style={{ color: '#888', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>
                                Introduce el codigo recibido en tu email y tu nueva contrasena.
                            </p>

                            <div className='input-container'>
                                <input
                                    type='text'
                                    placeholder='Codigo'
                                    maxLength={6}
                                    style={{ textAlign: 'center', fontSize: '22px', letterSpacing: codigo ? '6px' : '0' }}
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                    className='input-contraseña'
                                    required
                                />
                                <input
                                    type='password'
                                    placeholder='Nueva contrasena'
                                    value={passwordNueva}
                                    onChange={(e) => setPasswordNueva(e.target.value)}
                                    className='input-contraseña'
                                    required
                                />
                                <input
                                    type='password'
                                    placeholder='Repetir nueva contrasena'
                                    value={passwordRepetir}
                                    onChange={(e) => setPasswordRepetir(e.target.value)}
                                    className='input-contraseña'
                                    required
                                />
                                {error && <p className='error-message'>{error}</p>}
                            </div>

                            <button type='submit' className='boton-iniciar' disabled={cargando}>
                                {cargando ? 'Guardando...' : 'Guardar contrasena'}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </article>
    );
}

export default CambiarPasswordAdmin;
