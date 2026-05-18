import API_URL, { apiFetch } from './api.js';

export async function fetchEmpleados() {
    return apiFetch(`${API_URL}/usuarios`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching empleados:', error);
            throw error;
        });
}

export async function fetchEmpleadosdni(dni) {
    return apiFetch(`${API_URL}/usuarios/${dni}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching empleado:', error);
            throw error;
        });
}

export async function deleteEmpleado(dni) {
    return apiFetch(`${API_URL}/usuarios/${dni}`, { method: 'DELETE' })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .catch(error => {
            console.error('Error deleting empleado:', error);
            throw error;
        });
}

export async function addEmpleado(empleado) {
    const response = await apiFetch(`${API_URL}/sesion/registro`, {
        method: 'POST',
        body: JSON.stringify(empleado)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error al crear empleado');
    return data;
}

export async function updateEmpleado(dni, empleado) {
    return apiFetch(`${API_URL}/usuarios/${dni}`, {
        method: 'PUT',
        body: JSON.stringify(empleado)
    })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .catch(error => {
            console.error('Error updating empleado:', error);
            throw error;
        });
}

export async function getTrabajando(dni) {
    return apiFetch(`${API_URL}/usuarios/${dni}/trabajando`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching trabajando:', error);
            throw error;
        });
}

export async function setTrabajando(dni, estado) {
    try {
        const response = await apiFetch(`${API_URL}/usuarios/${dni}/trabajando`, {
            method: 'PUT',
            body: JSON.stringify({ trabajando: estado })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar estado');
        }
        return response;
    } catch (error) {
        console.error('Error en setTrabajando:', error);
        throw error;
    }
}
