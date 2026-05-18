import { useState, useEffect } from 'react';
import logo from "/src/assets/logo.png";
import '../styles/Anyadir.css';
import { addEmpleado } from '../controller/empleados';
import API_URL, { apiFetch } from '../controller/api';
import { useNavigate } from 'react-router-dom';
function Anyadir() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ nombre_completo: '', dni: '', puesto: '', email: '' });
    const [puestos, setPuestos] = useState([]);

    useEffect(() => {
        apiFetch(`${API_URL}/puestos`).then(r => r.json()).then(data => setPuestos(data));
    }, []);
    const [error, setError] = useState('');
    const [passwordTemporal, setPasswordTemporal] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const data = await addEmpleado(form);
            setPasswordTemporal(data.password_temporal);
        } catch (err) {
            setError(err.message || 'Error al añadir empleado');
        }
    };

    // Pantalla de confirmación con la contraseña temporal
    if (passwordTemporal) {
        return (
            <article className='anyadir'>
                <aside className='aside-left'>
                    <img src={logo} alt="Fragola" className='logo'/>
                </aside>
                <main className='anyadir-main'>
                    <div className='contenedor-anyadir'>
                        <h1>Empleado creado</h1>
                        <p style={{ marginBottom: '12px' }}>
                            Anota la contraseña temporal y dásela al empleado.
                            Deberá cambiarla en su primer inicio de sesión.
                        </p>
                        <div style={{
                            background: '#f5f5f5',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '20px',
                            textAlign: 'center',
                            marginBottom: '24px'
                        }}>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                                Contraseña temporal
                            </p>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px', fontFamily: 'monospace' }}>
                                {passwordTemporal}
                            </p>
                        </div>
                        <button className='boton-anyadir' onClick={() => navigate('/admin')}>
                            Volver a la lista
                        </button>
                    </div>
                </main>
            </article>
        );
    }

    return (
        <article className='anyadir'>
            <aside className='aside-left'>
                <img src={logo} alt="Fragola" className='logo'/>
                <button className='volver' onClick={() => navigate('/admin')}>Volver</button>
            </aside>

            <main className='anyadir-main'>
                <div className='contenedor-anyadir'>
                    <h1>Añadir empleado</h1>
                    <form onSubmit={handleSubmit} className='form-anyadir'>
                        <input
                            onChange={handleChange}
                            type="text"
                            name='nombre_completo'
                            placeholder='Nombre completo'
                            className='input-anyadir'
                            required
                        />
                        <input
                            onChange={handleChange}
                            type="text"
                            name='dni'
                            placeholder='DNI'
                            className='input-anyadir'
                            required
                        />
                        <input
                            onChange={handleChange}
                            type="email"
                            name='email'
                            placeholder='Email (para recibir la contraseña temporal)'
                            className='input-anyadir'
                        />
                        <select
                            name='puesto'
                            onChange={handleChange}
                            className='select-anyadir'
                            required
                            defaultValue=""
                        >
                            <option value="" disabled>Selecciona un puesto</option>
                            {puestos.map(p => (
                                <option key={p.id} value={p.nombre}>{p.nombre}</option>
                            ))}
                        </select>
                        {error && (
                            <p style={{ color: '#e74c3c', fontSize: '14px', marginBottom: '8px' }}>
                                {error}
                            </p>
                        )}
                        <button className='boton-anyadir' type='submit'>Añadir</button>
                    </form>
                </div>
            </main>
        </article>
    );
}

export default Anyadir;
