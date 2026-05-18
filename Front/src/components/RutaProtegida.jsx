import { Navigate } from 'react-router-dom';

function RutaProtegida({ children, rolRequerido }) {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    if (!token) {
        return <Navigate to="/IniciarSesion" replace />;
    }

    if (rolRequerido && rol !== rolRequerido) {
        if (rol === 'admin') return <Navigate to="/admin" replace />;
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default RutaProtegida;
