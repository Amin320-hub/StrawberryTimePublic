import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_URL from '../controller/api';
import logo from '/src/assets/logo.png';
import '../styles/IniciarSesion.css';

function IniciarSesion() {
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = new URLSearchParams(location.search).get('redirect');

    const [rol, setRol] = useState('empleado');
    const [identificador, setIdentificador] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const endpoint = rol === 'empleado' ? '/sesion/login' : '/sesion/login-admin';
            const body = rol === 'empleado'
                ? { dni: identificador, password }
                : { email: identificador, password };

            const respuesta = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.message || 'Error al iniciar sesión');
                return;
            }

            localStorage.setItem('token', datos.token);
            localStorage.setItem('nombre', datos.nombre);
            localStorage.setItem('rol', datos.rol || rol);
            if (rol === 'empleado') localStorage.setItem('dni', identificador);
            if (rol !== 'empleado') {
                localStorage.setItem('adminId', datos.id);
                localStorage.setItem('email', identificador);
            }

            if (datos.cambiar_password) {
                navigate('/cambiar-password', { state: { passwordActual: password } });
                return;
            }

            if (redirectTo) { navigate(redirectTo); return; }

            if (datos.rol === 'admin') navigate('/admin');
            else                      navigate('/dashboard');

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
                    <form onSubmit={handleSubmit} className='formulario-iniciar'>
                        <img src={logo} alt="Fragola" style={{ width: '80px', marginBottom: '20px' }} />
                        <h2>Iniciar sesion</h2>

                        <div className='toggle-rol'>
                            <button
                                type='button'
                                className={`toggle-btn ${rol === 'empleado' ? 'activo' : ''}`}
                                onClick={() => { setRol('empleado'); setIdentificador(''); setError(''); }}
                            >
                                Empleado
                            </button>
                            <button
                                type='button'
                                className={`toggle-btn ${rol !== 'empleado' ? 'activo' : ''}`}
                                onClick={() => { setRol('admin'); setIdentificador(''); setError(''); }}
                            >
                                Administrador
                            </button>
                        </div>

                        <div className='input-container'>
                            <input
                                type='text'
                                placeholder={rol === 'empleado' ? 'DNI' : 'Email'}
                                value={identificador}
                                onChange={(e) => setIdentificador(e.target.value)}
                                className='input-contraseña'
                                required
                            />
                            <input
                                type='password'
                                placeholder='Contraseña'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className='input-contraseña'
                                required
                            />
                            {error && <p className='error-message'>{error}</p>}
                        </div>

                        <button type='submit' className='boton-iniciar' disabled={cargando}>
                            {cargando ? 'Entrando...' : 'Entrar'}
                        </button>

                        <button
                            type='button'
                            className='boton-iniciar'
                            style={{ background: '#4caf50', marginTop: '8px' }}
                            onClick={() => navigate('/pantalla-qr')}
                        >
                            Pantalla QR
                        </button>
                    </form>
                </div>
            </main>
        </article>
    );
}

export default IniciarSesion;
