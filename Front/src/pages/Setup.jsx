import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../controller/api';
import logo from '/src/assets/logo.png';
import '../styles/IniciarSesion.css';

function Setup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        nombre: '', email: '', password: '', confirmar: '',
        smtp_host: 'smtp.gmail.com', smtp_port: '587',
        smtp_user: '', smtp_pass: '', email_destino: '',
        server_url: ''
    });
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmar) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (form.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setCargando(true);
        try {
            const res = await fetch(`${API_URL}/sesion/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre:        form.nombre,
                    email:         form.email,
                    password:      form.password,
                    smtp_host:     form.smtp_host,
                    smtp_port:     form.smtp_port,
                    smtp_user:     form.smtp_user,
                    smtp_pass:     form.smtp_pass,
                    email_destino: form.email_destino,
                    server_url:    form.server_url,
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Error al crear el administrador');
                return;
            }
            navigate('/IniciarSesion');
        } catch {
            setError('No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    }

    const inputStyle = { marginBottom: 0 };

    return (
        <div className='iniciarSesion'>
            <main>
                <div className='formulario-container'>
                    <form className='formulario-iniciar' onSubmit={handleSubmit} style={{ maxWidth: '520px' }}>
                        <img className='logo' src={logo} alt="Fragola" style={{ marginBottom: '16px' }} />
                        <h2>Configuración inicial</h2>
                        <p style={{ color: '#666', marginBottom: '24px', textAlign: 'center', fontSize: '14px' }}>
                            Esta pantalla solo aparece una vez. Crea el administrador y configura el correo.
                        </p>

                        {/* ── Sección admin ── */}
                        <p style={{ alignSelf: 'flex-start', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', color: '#333' }}>
                            Cuenta de administrador
                        </p>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='text' name='nombre'
                                placeholder='Nombre completo' value={form.nombre} onChange={handleChange} required />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='email' name='email'
                                placeholder='Email del administrador' value={form.email} onChange={handleChange} required />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='password' name='password'
                                placeholder='Contraseña' value={form.password} onChange={handleChange} required />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='password' name='confirmar'
                                placeholder='Confirmar contraseña' value={form.confirmar} onChange={handleChange} required />
                        </div>

                        {/* ── Separador ── */}
                        <div style={{ width: '100%', borderTop: '1px solid #eee', margin: '16px 0' }} />

                        {/* ── Sección SMTP ── */}
                        <p style={{ alignSelf: 'flex-start', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px', color: '#333' }}>
                            Correo para enviar notificaciones
                        </p>
                        <p style={{ alignSelf: 'flex-start', fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                            Usa una cuenta de Gmail con contraseña de aplicación. Puedes cambiarlo después desde el dashboard.
                        </p>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='text' name='smtp_host'
                                placeholder='Servidor SMTP (ej: smtp.gmail.com)' value={form.smtp_host} onChange={handleChange} />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='text' name='smtp_port'
                                placeholder='Puerto SMTP (ej: 587)' value={form.smtp_port} onChange={handleChange} />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='email' name='smtp_user'
                                placeholder='Email de envío' value={form.smtp_user} onChange={handleChange} />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='password' name='smtp_pass'
                                placeholder='Contraseña de aplicación de Gmail' value={form.smtp_pass} onChange={handleChange} />
                        </div>
                        <div className='input-container'>
                            <input className='input-contraseña' style={inputStyle} type='email' name='email_destino'
                                placeholder='Email que recibe los backups (el jefe)' value={form.email_destino} onChange={handleChange} />
                        </div>

                        {error && <p className='error-message'>{error}</p>}
                        <button className='boton-iniciar' type='submit' disabled={cargando} style={{ marginTop: '8px' }}>
                            {cargando ? 'Configurando...' : 'Crear sistema'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default Setup;
