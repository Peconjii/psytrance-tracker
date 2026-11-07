// Events: lists, details, going, reviews, timetables and the events people add
import api from './client.js'

// The archive: events that are over, newest first ({ content, hasNext, totalElements }); search in the name or town
export async function fetchPastEvents({ page, size, search }, signal) {
    const response = await api.get('/api/events/past', { params: { page, size, search: search || undefined }, signal })
    return response.data
}

// One page of events, filtered and paged by the backend. Throws on failure so the
// caller can show an error; pass an AbortSignal to cancel it when filters change.
// near: { lat, lon, km } for "Near me", or null
export async function fetchEventsPage({ page, size, search, country, genre, timeline, near }, signal) {
    const response = await api.get('/api/events', {
        params: {
            ...(near ? { lat: near.lat, lon: near.lon, km: near.km } : {}),
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

// An event's timetable: { eventId, manual, utcOffsetMinutes, sets: [{ stage, artist, artistSlug, startsAt, endsAt }] },
// times on the venue clock ("2026-10-24T22:00:00"); no sets when the line-up has no set times
export async function fetchTimetable(id, signal) {
    const response = await api.get(`/api/events/${id}/timetable`, { signal })
    return response.data
}

// Events added on our site. Ours have ids from OUR_EVENT_IDS up (Goabase's are far below).
export const OUR_EVENT_IDS = 1_000_000_000

export const isOurEvent = (id) => Number(id) > OUR_EVENT_IDS

// Adds an event (needs a confirmed email): { id, status: PENDING | APPROVED, eventId (once approved), ... }
export async function submitOurEvent(event) {
    const response = await api.post('/api/our-events', event)
    return response.data
}

// The events this account added, newest first, with their status and an admin's reason when rejected
// Whether this account may add a festival (organizers and festivals with a claimed page, editors, admins)
export async function fetchCanAddFestival(signal) {
    const response = await api.get('/api/our-events/can-add-festival', { signal })
    return response.data.canAddFestival
}

export async function fetchMyOurEvents(signal) {
    const response = await api.get('/api/our-events/mine', { signal })
    return response.data
}

// Takes back an event that is still waiting for an admin
export async function withdrawOurEvent(id) {
    await api.delete(`/api/our-events/${id}`)
}

// "Add to calendar": the event as a .ics file, which phones and calendar apps open
export const calendarUrl = (id) => `${api.defaults.baseURL}/api/events/${id}/calendar.ics`

// One event this account added (any for admins), for its edit form
export async function fetchOurEvent(id, signal) {
    const response = await api.get(`/api/our-events/${id}`, { signal })
    return response.data
}

// Changes an added event: a waiting one keeps waiting, an approved one changes on the map right away
export async function updateOurEvent(id, event) {
    const response = await api.put(`/api/our-events/${id}`, event)
    return response.data
}

// Admins: the featured events, newest first: [{ eventId, name, note, featuredBy, featuredAt, upcoming }]
export async function fetchFeaturedEvents(signal) {
    const response = await api.get('/api/admin/events/featured', { signal })
    return response.data
}
