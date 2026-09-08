import axios from "axios";

const api = axios.create({
    baseURL: 'http://localhost:8080'
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }
    return config
})

function normalizeEvent(rawEvent) {
    if (!rawEvent) return null;
    const event = rawEvent.party || rawEvent;

    return {
        id: String(event.id || ''),
        nameParty: event.nameParty || 'Untitled Event',
        nameTown: event.nameTown || 'Unknown Location',
        nameCountry: event.nameCountry || '',
        dateStart: event.dateStart ? event.dateStart.split('T')[0] : 'TBA',
        startTime: event.startTime || event.dateStart || 'N/A',
        nameType: event.nameType || 'Party',
        urlImageMedium: event.urlImageMedium || null,
        urlPartyHtml: event.urlPartyHtml || '#'
    };
}

export async function fetchGoabaseEvents(limit = 150) {
    try {
        const response = await api.get('/api/goabase/events', { params: { limit } })
        const list = response.data?.partylist || (Array.isArray(response.data) ? response.data : [])
        return list.map(normalizeEvent).filter(Boolean)
    } catch (err) {
        console.error("Error fetching Goabase events:", err)
        return []
    }
}

export async function fetchGoabaseEventsByCountry(country, limit = 150) {
    try {
        const response = await api.get('/api/goabase/events/country', { params: { country, limit } })
        const list = response.data?.partylist || (Array.isArray(response.data) ? response.data : [])
        return list.map(normalizeEvent).filter(Boolean)
    } catch (err) {
        console.error("Error fetching events by country:", err)
        return []
    }
}

export async function fetchGoabaseEventById(id) {
    try {
        const response = await api.get(`/api/goabase/events/${id}`)
        return normalizeEvent(response.data)
    } catch (err) {
        console.error("Error fetching event by id:", err)
        return null
    }
}

export default api