import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Boton from '../components/Boton';
import logo from "/src/assets/logo.png"
import HorariosDias from '../components/HorariosDias.jsx';
import HorarioMes from '../components/HorarioMes.jsx';
import HorarioAño from '../components/HorarioAño.jsx';
import '../styles/Horarios.css';
import HorarioTotal from '../components/HorarioTotal.jsx';

function Horarios() {
    const navigate = useNavigate();
    const [control, setControl] = useState("dia");
    const [fechasDias, setFechasDias] = useState("");

    return (
        <section className="horarios-section">
            <aside className='aside-left'>
                <img 
                    className='logo'
                    src={logo} 
                    alt="Fragola" 
                />
                <div 
                    className='boton-volver' 
                    onClick={() => { navigate(-1); }}
                >
                    <Boton text="Volver" w={"150px"} h={"50px"} />
                </div>
            </aside>
            
            <main className='horarios-main'>
                
                <nav className='nav-control'>
                    <div className="control-buttons">
                        <button 
                            className={`boton-control ${control === "dia" ? "active" : ""}`} 
                            onClick={() => setControl("dia")}
                        >
                            Día
                        </button>
                        <button 
                            className={`boton-control ${control === "mes" ? "active" : ""}`} 
                            onClick={() => setControl("mes")}
                        >
                            Mes
                        </button>
                        <button 
                            className={`boton-control ${control === "año" ? "active" : ""}`} 
                            onClick={() => setControl("año")}
                        >
                            Año
                        </button>
                        <button 
                            className={`boton-control ${control === "total" ? "active" : ""}`} 
                            onClick={() => setControl("total")}
                        >
                            Total
                        </button>
                    </div>
                    
                    <div className="control-inputs">
                        {control === "dia" && (
                            <input 
                                type="date" 
                                onChange={(e) => setFechasDias(e.target.value)}
                                className='input-control' 
                            />
                        )}
                        {control === "mes" && (
                            <input 
                                type="month" 
                                onChange={(e) => setFechasDias(e.target.value)}
                                className='input-control' 
                            />
                        )}
                        {control === "año" && (
                            <input
                                id="year-input"
                                type="number"
                                min="2000"
                                max="2100"
                                step="1"
                                onChange={(e) => setFechasDias(e.target.value)}
                                placeholder="YYYY"
                                className='input-control'
                            />
                        )}
                    </div>
                </nav>
                
                <div className='horarios-container'>
                    {control === "dia" && fechasDias !== "" && (
                        <HorariosDias data={fechasDias} editable={true} adminId={localStorage.getItem('adminId')} />
                    )}
                    {control === "mes" && fechasDias !== "" && (
                        <HorarioMes data={fechasDias} />
                    )}
                    {control === "año" && fechasDias !== "" && (
                        <HorarioAño data={fechasDias} />
                    )}
                    {control === "total" && (
                        <HorarioTotal/>
                    )}
                </div>
            </main>
        </section>
    );
}

export default Horarios;