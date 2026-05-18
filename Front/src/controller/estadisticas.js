import API_URL, { apiFetch } from './api.js';

export async function getEstadisticasDia(dni, dia) {
    return apiFetch(`${API_URL}/estadisticas/horas/dia/${dni}?fecha=${dia}`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching estadisticas dia:', error);
            throw error;
        });
}

export async function getEstadisticasMes(dni, mes) {
    return apiFetch(`${API_URL}/estadisticas/horas/mes/${dni}?mes=${mes}`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching estadisticas mes:', error);
            throw error;
        });
}

export async function getEstadisticasAño(dni, año) {
    return apiFetch(`${API_URL}/estadisticas/horas/ano/${dni}?ano=${año}`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching estadisticas año:', error);
            throw error;
        });
}

export async function getEstadisticastotal(dni) {
    return apiFetch(`${API_URL}/estadisticas/horas/total/${dni}`)
        .then(response => response.json())
        .catch(error => {
            console.error('Error fetching estadisticas total:', error);
            throw error;
        });
}
