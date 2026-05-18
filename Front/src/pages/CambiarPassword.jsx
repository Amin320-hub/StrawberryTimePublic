import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_URL from '../controller/api';
import logo from "/src/assets/logo.png";
import '../styles/IniciarSesion.css';

function CambiarPassword() {
    const navigate  = useNavigate();
    const location  = useLocation();
    // Si venimos del login, la contraseña temporal llega por state y no hace falta pedirla
    const prefilled = location.state?.passwordActual || '';

    const [passwordActual, setPasswordActual] = useState(prefilled);
    const [passwordNueva, setPasswordNueva]   = useState('');
    const [passwordRepetir, setPasswordRepetir] = useState('');
    const [error, setError]     = useState('');
    const [cargando, setCargando] = useState(false);

    const rol     = localStorage.getItem('rol');
    const dni     = localStorage.getItem('dni');
    const adminId = localStorage.getItem('adminId');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (passwordNueva !== passwordRepetir) {
            setError('Las contraseñas nuevas no coinciden');
            return;
        }

        if (passwordNueva.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setCargando(true);

        try {
            const esAdmin = rol === 'admin';
            const endpoint = esAdmin ? '/sesion/cambiar-password-admin' : '/sesion/cambiar-password';
            const body = esAdmin
                ? { id: adminId, password_actual: passwordActual, password_nueva: passwordNueva }
                : { dni, password_actual: passwordActual, password_nueva: passwordNueva };

            const respuesta = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.message || 'Error al cambiar la contraseña');
                return;
            }

            if (rol === 'admin') navigate('/admin');
            else navigate('/dashboard');

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
                        <h2>Cambiar contrasena</h2>
                        <p style={{ color: '#888', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>
                            Es tu primer acceso. Debes establecer una contrasena personal.
                        </p>

                        <div className='input-container'>
                            {!prefilled && (
                                <input
                                    type='password'
                                    placeholder='Contraseña actual'
                                    value={passwordActual}
                                    onChange={(e) => setPasswordActual(e.target.value)}
                                    className='input-contraseña'
                                    required
                                />
                            )}
                            <input
                                type='password'
                                placeholder='Nueva contraseña'
                                value={passwordNueva}
                                onChange={(e) => setPasswordNueva(e.target.value)}
                                className='input-contraseña'
                                required
                            />
                            <input
                                type='password'
                                placeholder='Repetir nueva contraseña'
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
                </div>
            </main>
        </article>
    );
}

export default CambiarPassword;
