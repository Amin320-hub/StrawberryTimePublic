import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida'
import Inicio from './pages/Inicio'
import Entrada from './pages/Entrada'
import IniciarSesion from './pages/IniciarSesion'
import CambiarPassword from './pages/CambiarPassword'
import CambiarPasswordAdmin from './pages/CambiarPasswordAdmin'
import DashboardEmpleado from './pages/DashboardEmpleado'
import DashboardAdmin from './pages/DashboardAdmin'
import Setup from './pages/Setup'
import Fichar from './pages/Fichar'
import Anyadir from './pages/Anyadir'
import Editar from './pages/Editar'
import Horarios from './pages/Horarios'
import PantallaQR from './pages/PantallaQR'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/"               element={<Inicio />} />
        <Route path="/setup"          element={<Setup />} />
<Route path="/fichar"         element={<Fichar />} />
        <Route path="/IniciarSesion"  element={<IniciarSesion />} />
        <Route path="/pantalla-qr"    element={<PantallaQR />} />
        <Route path="/Entrada/:persona" element={<Entrada />} />

        {/* Cambio de contraseña — accesible tras login pero antes del dashboard */}
        <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route path="/admin-cambiar-password" element={
          <RutaProtegida rolRequerido="admin"><CambiarPasswordAdmin /></RutaProtegida>
        } />

        {/* Dashboard empleado */}
        <Route path="/dashboard" element={
          <RutaProtegida rolRequerido="empleado">
            <DashboardEmpleado />
          </RutaProtegida>
        } />

        {/* Dashboard administrador */}
        <Route path="/admin" element={
          <RutaProtegida rolRequerido="admin">
            <DashboardAdmin />
          </RutaProtegida>
        } />

        {/* Páginas de gestión — solo admin */}
        <Route path="/horarios" element={
          <RutaProtegida rolRequerido="admin"><Horarios /></RutaProtegida>
        } />
        <Route path="/AgregarEmpleado" element={
          <RutaProtegida rolRequerido="admin"><Anyadir /></RutaProtegida>
        } />
        <Route path="/editar/:dni" element={
          <RutaProtegida rolRequerido="admin"><Editar /></RutaProtegida>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
