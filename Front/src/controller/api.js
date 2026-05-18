const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default API_URL;

// Wrapper de fetch que añade el token JWT automaticamente
export function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
}
