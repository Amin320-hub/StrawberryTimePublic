import API_URL from './api.js';

export const ficharEntrada = async (dni) => {
    try {
        const response = await fetch(`${API_URL}/jornadas/entrada`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al registrar la entrada');
        }
        return await response.json();
    } catch (error) {
        console.error('Error en ficharEntrada:', error);
        throw error;
    }
};

export async function ficharSalida(dni) {
    try {
        const response = await fetch(`${API_URL}/jornadas/salida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni })
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(text || 'Respuesta no JSON del servidor');
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al registrar la salida');
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fichando salida para ${dni}:`, error);
        throw error;
    }
}
