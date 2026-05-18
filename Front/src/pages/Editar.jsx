import { useState, useEffect } from 'react';
import logo from "/src/assets/logo.png";
import '../styles/Anyadir.css';
import { fetchEmpleadosdni, updateEmpleado } from '../controller/empleados';
import API_URL, { apiFetch } from '../controller/api';
import { useNavigate, useParams } from 'react-router-dom';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Editar() {
    const navigate = useNavigate();
    const { dni: dniOriginal } = useParams();
    const [form, setForm] = useState({ nombre_completo: '', dni: '', puesto: '', email: '' });
    const [puestos, setPuestos] = useState([]);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [guardado, setGuardado] = useState(false);

    useEffect(() => {
        apiFetch(`${API_URL}/puestos`).then(r => r.json()).then(setPuestos);
    }, []);

    useEffect(() => {
        fetchEmpleadosdni(dniOriginal)
            .then(data => setForm({
                nombre_completo: data.nombre_completo || '',
                dni: data.dni || '',
                puesto: data.puesto || '',
                email: data.email || '',
            }))
            .catch(() => setError('No se pudo cargar el empleado'));
    }, [dniOriginal]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (name === 'email') setEmailError('');
    };

    const handleEmailBlur = () => {
        if (form.email && !EMAIL_REGEX.test(form.email)) {
            setEmailError('El formato del email no es valido');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.email && !EMAIL_REGEX.test(form.email)) {
            setEmailError('El formato del email no es valido');
            return;
        }

        try {
            await updateEmpleado(dniOriginal, {
                nombre_completo: form.nombre_completo,
                dni: form.dni,
                puesto: form.puesto,
                email: form.email,
            });
            setGuardado(true);
        } catch (err) {
            setError(err.message || 'Error al guardar');
        }
    };

    if (guardado) {
        return (
            <article className='anyadir'>
                <aside className='aside-left'>
                    <img src={logo} alt="Fragola" className='logo' />
                </aside>
                <main className='anyadir-main'>
                    <div className='contenedor-anyadir'>
                        <h1>Empleado actualizado</h1>
                        <p style={{ color: 'white', marginBottom: '24px' }}>
                            Los datos se han guardado correctamente.
                        </p>
                        <button className='boton-anyadir' onClick={() => navigate('/admin')}>
                            Volver al panel
                        </button>
                    </div>
                </main>
            </article>
        );
    }

    return (
        <article className='anyadir'>
            <aside className='aside-left'>
                <img src={logo} alt="Fragola" className='logo' />
                <button className='volver' onClick={() => navigate('/admin')}>Volver</button>
            </aside>

            <main className='anyadir-main'>
                <div className='contenedor-anyadir'>
                    <h1>Editar empleado</h1>
                    <form onSubmit={handleSubmit} className='form-anyadir'>
                        <input
                            onChange={handleChange}
                            type="text"
                            name='nombre_completo'
                            placeholder='Nombre completo'
                            className='input-anyadir'
                            value={form.nombre_completo}
                            required
                        />
                        <input
                            onChange={handleChange}
                            type="text"
                            name='dni'
                            placeholder='DNI'
                            className='input-anyadir'
                            value={form.dni}
                            required
                        />
                        <input
                            onChange={handleChange}
                            onBlur={handleEmailBlur}
                            type="text"
                            name='email'
                            placeholder='Email'
                            className='input-anyadir'
                            value={form.email}
                        />
                        {emailError && (
                            <p style={{ color: 'white', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}>
                                {emailError}
                            </p>
                        )}
                        <select
                            name='puesto'
                            onChange={handleChange}
                            className='select-anyadir'
                            value={form.puesto}
                        >
                            <option value="">Sin puesto</option>
                            {puestos.map(p => (
                                <option key={p.id} value={p.nombre}>{p.nombre}</option>
                            ))}
                        </select>
                        {error && (
                            <p style={{ color: 'white', fontSize: '13px', marginBottom: '8px', alignSelf: 'flex-start' }}>
                                {error}
                            </p>
                        )}
                        <button className='boton-anyadir' type='submit'>Guardar</button>
                    </form>
                </div>
            </main>
        </article>
    );
}

export default Editar;
