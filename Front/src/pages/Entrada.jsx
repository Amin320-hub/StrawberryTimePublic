import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import logo from "/src/assets/logo.png";
import '../styles/Entrada.css';
import Boton from '../components/Boton';
import { fetchEmpleadosdni, getTrabajando, setTrabajando } from '../controller/empleados';
import { ficharEntrada, ficharSalida } from '../controller/fichaje';
import Cargando from "../pages/Cargando.jsx";

function Entrada() {
    const navigate = useNavigate();
    const { persona: dni } = useParams();
    const [empleado, setEmpleado] = useState(null);
    const [entrada, setEntrada] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [date] = useState(new Date());

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setCargando(true);
                const datosEmpleado = await fetchEmpleadosdni(dni);
                if (!datosEmpleado) {
                    throw new Error('Empleado no encontrado');
                }
                setEmpleado(datosEmpleado);
                
                const estadoTrabajo = await getTrabajando(dni);
                setEntrada(estadoTrabajo?.trabajando || false);
            } catch (err) {
                console.error('Error cargando datos:', err);
                setError(err.message || "Error al cargar los datos del empleado");
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [dni]);

   const handleFicharEntrada = async () => {
    try {
        if (!empleado?.dni) {
            throw new Error('DNI del empleado no disponible');
        }
        
        setCargando(true);

        const respuestaEntrada = await ficharEntrada(empleado.dni);

        const respuestaTrabajando = await setTrabajando(empleado.dni, true);
        if (!respuestaTrabajando.ok) {
            throw new Error('Error al actualizar estado trabajando');
        }
        
        setEntrada(true);
    } catch (error) {
        console.error("Error completo:", error);
        
        let mensajeError = "Error al fichar entrada";
        if (error.message.includes("dni es requerido")) {
            mensajeError = "Error: El DNI no se está enviando correctamente al servidor";
        }
        
        alert(`${mensajeError}: ${error.message}`);
        setEntrada(false);
    } finally {
        setCargando(false);
    }
};

    const handleFicharSalida = async () => {
    try {
        if (!empleado?.dni) {
            throw new Error('DNI del empleado no disponible');
        }
        
        setCargando(true);
        
        const respuestaSalida = await ficharSalida(empleado.dni);

        const respuestaTrabajando = await setTrabajando(empleado.dni, false);
        if (!respuestaTrabajando.ok) {
            throw new Error('Error al actualizar estado trabajando');
        }
        
        setEntrada(false);
    } catch (error) {
        console.error("Error al fichar salida:", error);
        
        let mensajeError = "Error al fichar salida";
        if (error.message.includes("<!DOCTYPE html>")) {
            mensajeError = "Error en el servidor al procesar la solicitud";
        } else if (error.message.includes("404")) {
            mensajeError = "El servicio de fichaje no está disponible";
        }
        
        alert(`${mensajeError}: ${error.message}`);
    } finally {
        setCargando(false);
    }
};

    const formatoFecha = `${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1).toString().padStart(2, "0")} / ${date.getFullYear()}`;

    if (error) {
        return (
            <article className='entrada'>
                <main className='entrada-main'>
                    <p className="error-message">{error}</p>
                    <button 
                        onClick={() => navigate("/")} 
                        className='volver'
                    >
                        Volver
                    </button>
                </main>
            </article>
        );
    }

    return (
        <article className='entrada'>
            <aside className='aside-left'>
                <img 
                    src={logo} 
                    alt="Logo Fragola" 
                    className="logo" 
                />
                <div className='boton-volver' onClick={() => navigate("/")}>
                    <Boton text="Volver" w="120px" h="50px" />
                </div>
            </aside>

            <main className='entrada-main'>
                {cargando ? (
                    <Cargando />
                ) : (
                    <>
                        <p>
                            {empleado 
                                ? `${empleado.nombre_completo} ${empleado.dni}` 
                                : "Usuario no encontrado"}
                        </p>
                        <div>
                            <button 
                                className='button' 
                                disabled={entrada}
                                onClick={handleFicharEntrada}
                            >
                                ENTRADA
                            </button>
                            <button 
                                className='button' 
                                disabled={!entrada}
                                onClick={handleFicharSalida}
                            >
                                SALIDA
                            </button>
                        </div>
                    </>
                )}
            </main>

            <aside className='aside-right'>
                {formatoFecha}
            </aside>
        </article>
    );
}

export default Entrada;