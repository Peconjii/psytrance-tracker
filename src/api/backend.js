import axios from "axios";

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

// One page of events, filtered and paged by the backend. Throws on failure so the
// caller can show an error; pass an AbortSignal to cancel it when filters change.
export async function fetchEventsPage({ page, size, search, country, genre, timeline }, signal) {
    const response = await api.get('/api/events', {
        params: {
            page,
            size,
            search: search || undefined,
            country: country || undefined,
            genre: genre && genre !== 'All' ? genre : undefined,
            timeline
        },
        signal
    })
    return response.data
}

// Every event that has coordinates, for the world map
export async function fetchMapEvents() {
    try {
        const response = await api.get('/api/events/map')
        return Array.isArray(response.data) ? response.data : []
    } catch (err) {
        console.error("Error fetching map events:", err)
        return []
    }
}

export async function fetchEventById(id) {
    try {
        const response = await api.get(`/api/events/${id}`)
        return response.data
    } catch (err) {
        console.error("Error fetching event by id:", err)
        return null
    }
}

// Everything for the event page (line-up, times, entry fee...). Throws on failure so the
// page can tell "no such event" (err.response.status 404) from Goabase being down.
export async function fetchEventDetails(id, signal) {
    const response = await api.get(`/api/events/${id}/details`, { signal })
    return response.data
}

// { videoId, title } of the festival's aftermovie, or null when there is none (the API answers 204).
// Never throws: the video is a nice extra, so on any failure the page just shows none.
export async function fetchAftermovie(id, signal) {
    try {
        const response = await api.get(`/api/events/${id}/aftermovie`, { signal })
        return response.data?.videoId ? response.data : null
    } catch {
        return null
    }
}

export async function fetchEventReviews(eventId) {
    try {
        const response = await api.get(`/api/reviews/event/${eventId}`)
        return response.data || []
    } catch (err) {
        console.error("Error fetching reviews:", err)
        return []
    }
}

export async function submitEventReview(eventId, rating, comment) {
    const response = await api.post('/api/reviews', {
        eventId,
        rating,
        comment
    })
    return response.data
}

// Both throw on failure; the backend's { message } is in err.response.data
export async function requestPasswordReset(email) {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
}

export async function resetPassword(token, newPassword) {
    const response = await api.post('/api/auth/reset-password', { token, newPassword })
    return response.data
}

export default api