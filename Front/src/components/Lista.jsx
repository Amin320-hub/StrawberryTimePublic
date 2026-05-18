import React from 'react';
import { deleteEmpleado } from '../controller/empleados';
import '../styles/lista.css';
import Boton from './Boton';
import { useNavigate } from 'react-router-dom';

function Lista({ list, admin, redirectEntrada, setEmpleado }) {
  const navigate = useNavigate();
    
  const liHandleClick = (e) => {
    if (redirectEntrada) {
      navigate(`/Entrada/${e.dni}`);
    }
  };

  const handleDelete = (empleado) => {
    if (window.confirm(`¿Está seguro de eliminar a ${empleado.nombre_completo}?`)) {
      deleteEmpleado(empleado.dni)
        .then(() => {
          setEmpleado(prev => prev.filter(item => item.dni !== empleado.dni));
        })
        .catch(error => {
          console.error('Error deleting empleado:', error);
          alert(`Error al eliminar el empleado: ${empleado.nombre_completo}`);
        });
    }
  };

  const handleEdit = (empleado) => {
    navigate(`/EditarEmpleado/${empleado.dni}`);
  };

  return (
    <table className='tabla-empleados'>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>DNI</th>
          <th>Puesto</th>
          {admin && <th colSpan="2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {list.map((empleado) => (
          <tr 
            key={empleado.dni} 
            onClick={!admin ? () => liHandleClick(empleado) : undefined}
            className={!admin ? 'clickable-row' : ''}
          >
            <td data-label="Nombre">{empleado.nombre_completo}</td>
            <td data-label="DNI">{empleado.dni}</td>
            <td data-label="Puesto">{empleado.puesto}</td>
            {admin && (
              <>
                <td data-label="Editar">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(empleado);
                    }} 
                    className='accion-btn editar-btn'
                  >
                    Editar
                  </button>
                </td>
                <td data-label="Eliminar">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(empleado);
                    }} 
                    className='accion-btn eliminar-btn'
                  >
                    Eliminar
                  </button>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Lista;