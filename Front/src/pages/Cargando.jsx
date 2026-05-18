import React from 'react';
import '../styles/Cargando.css';

function Cargando() {
  return (
    <main aria-label="Cargando contenido">
      <div className="cargando-container">
        <div className="cargando-animation">
          <div className="pelota"></div>
          <div className="pelota"></div>
          <div className="pelota"></div>
        </div>
        <span className="cargando-texto">Cargando...</span>
      </div>
    </main>
  );
}

export default Cargando;