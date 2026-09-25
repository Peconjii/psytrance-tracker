import axios from "axios";

const api = axios.create({
    baseURL: 'http://localhost:8080'
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