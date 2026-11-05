// The connection to the backend: the address and your login on every request. The calls themselves are in
// the files next to this one, by topic; backend.js gathers them all.
import axios from 'axios'

const api = axios.create({
    // Set VITE_API_URL at build time (e.g. on Vercel); falls back to the local backend
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080'
})

// Safely attach token only if it is a valid non-empty string
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined' && token !== 'null' && token.trim() !== '') {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }
    return config
})

export default api
