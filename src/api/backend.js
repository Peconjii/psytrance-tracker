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

// { [eventId]: { count, going } } for a whole page of events in one request. Never throws:
// the counts are an extra, so on failure the cards just show none.
export async function fetchGoingForEvents(events, signal) {
    const ids = events.map(event => event.id).filter(Boolean)
    if (ids.length === 0) return {}
    try {
        const response = await api.get('/api/events/going', { params: { ids: ids.join(',') }, signal })
        return response.data || {}
    } catch {
        return {}
    }
}

// Map of Psy genres for a whole list of events in one request: { [eventId]: [{ genreId, share, source }] }.
// Events with no known genre are missing; on failure the cards simply show no genres.
export async function fetchGenresForEvents(events, signal) {
    const ids = events.map(event => event.id).filter(Boolean)
    if (ids.length === 0) return {}
    try {
        const response = await api.get('/api/map/genres', { params: { ids: ids.join(',') }, signal })
        return response.data || {}
    } catch {
        return {}
    }
}

export async function fetchGoing(eventId, signal) {
    try {
        const response = await api.get(`/api/events/${eventId}/going`, { signal })
        return response.data
    } catch {
        return null
    }
}

// Marks (going = true) or unmarks the logged-in user; returns the new { count, going }. Throws on failure.
export async function setGoing(eventId, going) {
    const response = going
        ? await api.put(`/api/events/${eventId}/going`)
        : await api.delete(`/api/events/${eventId}/going`)
    return response.data
}

// [{ eventId, eventName, startsOn }] of the events the logged-in user is going to
export async function fetchMyGoing() {
    const response = await api.get('/api/me/going')
    return response.data || []
}

export async function setEventReminders(enabled) {
    const response = await api.put('/api/me/reminders', { enabled })
    return response.data.enabled
}

// [{ slug, name, upcomingEvents }], busiest first. Throws on failure.
export async function fetchArtists(search, signal) {
    const response = await api.get('/api/artists', { params: { search: search || undefined }, signal })
    return response.data || []
}

// { slug, name, upcomingEvents: [event, ...] }. Throws on failure (err.response.status 404 for unknown artists).
export async function fetchArtist(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}`, { signal })
    return response.data
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
// Feedback form. Throws on failure; the backend's { message } (and { errors } for invalid fields) is in err.response.data
export async function sendFeedback(feedback) {
    const response = await api.post('/api/feedback', feedback)
    return response.data
}

// Admins only: all feedback newest first, or only one status (NEW, IN_PROGRESS, DONE, REJECTED)
export async function fetchFeedback(status, signal) {
    const response = await api.get('/api/admin/feedback', { params: status ? { status } : {}, signal })
    return response.data
}

export async function setFeedbackStatus(id, status) {
    const response = await api.patch(`/api/admin/feedback/${id}`, { status })
    return response.data
}

// Which artists orbit which genre on the map: { genreId: [artist names] }
export async function fetchPlacements(signal) {
    const response = await api.get('/api/map/placements', { signal })
    return response.data
}

// Admin panel: map and line-up artists whose name contains the search, with their map genres
export async function searchAdminArtists(search, signal) {
    const response = await api.get('/api/admin/artists', { params: { search }, signal })
    return response.data
}

// Admin panel: place an artist in exactly these map genres ([] takes them off the map). Throws on failure.
export async function setArtistGenres(name, genres) {
    const response = await api.put('/api/admin/artists/genres', { name, genres })
    return response.data
}

// Admin history: the latest changes made in the admin panel, newest first
export async function fetchAdminChanges(signal) {
    const response = await api.get('/api/admin/changes', { signal })
    return response.data
}

// Puts back what a change replaced; the backend refuses (409) when it was undone already or changed again since
export async function undoAdminChange(id) {
    const response = await api.post(`/api/admin/changes/${id}/undo`)
    return response.data
}

// Admin panel: an event's map genres and whether an admin set them by hand
export async function fetchAdminEventGenres(id, signal) {
    const response = await api.get(`/api/admin/events/${id}/genres`, { signal })
    return response.data
}

// Admin panel: set an event's genres by hand ([] hands it back to its line-up). Throws on failure.
export async function setAdminEventGenres(id, genres) {
    const response = await api.put(`/api/admin/events/${id}/genres`, { genres })
    return response.data
}

// Admin panel: mark a line-up word as "not an artist" (hidden: true), or show it again. Throws on failure.
export async function setArtistHidden(name, hidden) {
    await api.post('/api/admin/artists/hidden', { name, hidden })
}

// Admin panel: merge the artist `from` into `into` (two spellings of one artist). Can't be undone.
export async function mergeArtists(from, into) {
    await api.post('/api/admin/artists/merge', { from, into })
}

// An event's timetable: { eventId, manual, utcOffsetMinutes, sets: [{ stage, artist, artistSlug, startsAt, endsAt }] },
// times on the venue clock ("2026-10-24T22:00:00"); no sets when the line-up has no set times
export async function fetchTimetable(id, signal) {
    const response = await api.get(`/api/events/${id}/timetable`, { signal })
    return response.data
}

// Admin panel: an event's timetable set by hand (sets with venue-clock times). Throws on failure.
export async function setAdminTimetable(id, sets) {
    const response = await api.put(`/api/admin/events/${id}/timetable`, { sets })
    return response.data
}

// Admin panel: back to the set times written in the line-up
export async function handBackTimetable(id) {
    const response = await api.delete(`/api/admin/events/${id}/timetable`)
    return response.data
}
