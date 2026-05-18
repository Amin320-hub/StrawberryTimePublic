import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../controller/api';

function Inicio() {
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API_URL}/sesion/setup-needed`)
            .then(res => res.json())
            .then(data => navigate(data.setup ? '/setup' : '/IniciarSesion', { replace: true }))
            .catch(() => navigate('/IniciarSesion', { replace: true }));
    }, []);

    return null;
}

export default Inicio;
