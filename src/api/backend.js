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
// The archive: events that are over, newest first ({ content, hasNext, totalElements }); search in the name or town
export async function fetchPastEvents({ page, size, search }, signal) {
    const response = await api.get('/api/events/past', { params: { page, size, search: search || undefined }, signal })
    return response.data
}

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

export async function setEventReminders(enabled) {
    const response = await api.put('/api/me/reminders', { enabled })
    return response.data.enabled
}

// "Delete my account": the password again; everything that is the person's goes for good
export async function deleteAccount(password) {
    await api.post('/api/me/delete-account', { password })
}

// The Monday email with the next gigs of who the account follows; returns the new setting
export async function setWeeklyDigest(enabled) {
    const response = await api.put('/api/me/weekly-digest', { enabled })
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

// The link from the verification email: { username, message }. Throws (400) for a used or expired link.
export async function verifyEmail(token) {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
}

// "Send the link again" for the logged-in account: { message }. 429 when a link was just sent.
export async function resendVerification() {
    const response = await api.post('/api/auth/resend-verification')
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

// Every label of the map: [{ label, crew, upcomingGigs, followers }]
export async function fetchLabelsOverview(signal) {
    const response = await api.get('/api/labels/overview', { signal })
    return response.data
}

// The site's search box: { artists, organizers, events, labels, festivals } whose name has the words in it
export async function searchSite(q, signal) {
    const response = await api.get('/api/search', { params: { q }, signal })
    return response.data
}

// The labels and festivals admins added to the map: { labels: [{ name, country, since, genres, x, y }], festivals: [...] }
export async function fetchMapExtras(signal) {
    const response = await api.get('/api/map/extras', { signal })
    return response.data
}

// For admins: put a label ({ name, country, since, genres }) or festival (also { description }) on the map
export async function addMapLabel(label) {
    const response = await api.post('/api/admin/map/labels', label)
    return response.data
}

export async function addMapFestival(festival) {
    const response = await api.post('/api/admin/map/festivals', festival)
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

// Artists the logged-in user follows: [{ slug, name }]
export async function fetchFollows(signal) {
    const response = await api.get('/api/me/follows', { signal })
    return response.data
}

// Upcoming events where followed artists play: [{ eventId, artists: [names] }]
export async function fetchFollowedGigs(signal) {
    const response = await api.get('/api/me/follows/gigs', { signal })
    return response.data
}

// Follow an artist from the line-ups (following twice is fine). Throws on failure.
export async function followArtist(slug) {
    const response = await api.put(`/api/me/follows/${encodeURIComponent(slug)}`)
    return response.data
}

export async function unfollowArtist(slug) {
    await api.delete(`/api/me/follows/${encodeURIComponent(slug)}`)
}

// Labels of the map the logged-in user follows: [names]. Their artists' gigs join the followed gigs.
export async function fetchLabelFollows(signal) {
    const response = await api.get('/api/me/label-follows', { signal })
    return response.data
}

// Follow a label of the map (following twice is fine). Throws on failure.
export async function followLabel(label) {
    const response = await api.put('/api/me/label-follows', null, { params: { label } })
    return response.data
}

export async function unfollowLabel(label) {
    await api.delete('/api/me/label-follows', { params: { label } })
}

// Editing an artist (their owner or an admin): everything the editor shows
// { slug, name, profile, tracks, festivals, genres, pendingRequests, owner (admins only) }
export async function fetchArtistEdit(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}/edit`, { signal })
    return response.data
}

const artistPath = (slug) => `/api/artists/${encodeURIComponent(slug)}`

// The whole profile (blank fields clear them). Throws on failure; invalid fields are in err.response.data.errors
export async function saveArtistProfile(slug, profile) {
    const response = await api.put(`${artistPath(slug)}/profile`, profile)
    return response.data
}

// The tracks on the profile, in order: [{ title, url }] (at most 6)
export async function saveArtistTracks(slug, tracks) {
    const response = await api.put(`${artistPath(slug)}/tracks`, { tracks })
    return response.data
}

// The festivals played, in order: [{ name, year, url }] (at most 20)
export async function saveArtistFestivals(slug, festivals) {
    const response = await api.put(`${artistPath(slug)}/festivals`, { festivals })
    return response.data
}

// Ask for other map genres ({ kind: 'GENRES', genres }) or another name ({ kind: 'NAME', name }); an admin decides
export async function requestArtistChange(slug, change) {
    const response = await api.post(`${artistPath(slug)}/requests`, change)
    return response.data
}

// The artists whose profile this account owns: [{ slug, name }]
export async function fetchMyArtists(signal) {
    const response = await api.get('/api/me/artists', { signal })
    return response.data
}

// Admin panel: link an account to an artist as its owner, or unlink it
export async function setArtistOwner(slug, username) {
    const response = await api.put(`/api/admin/artists/${encodeURIComponent(slug)}/owner`, { username })
    return response.data
}

export async function removeArtistOwner(slug) {
    await api.delete(`/api/admin/artists/${encodeURIComponent(slug)}/owner`)
}

// Admin panel: owners' genre and name requests waiting for a decision, newest first
export async function fetchArtistRequests(signal) {
    const response = await api.get('/api/admin/artists/requests', { signal })
    return response.data
}

export async function decideArtistRequest(id, approve) {
    const response = await api.post(`/api/admin/artists/requests/${id}`, { approve })
    return response.data
}

// The artist's main role: 'DJ', 'PRODUCER' or 'LIVE'; null hands it back to the guess. Their owner or an admin.
export async function setArtistRole(slug, role) {
    const response = await api.put(`/api/artists/${encodeURIComponent(slug)}/role`, { role })
    return response.data
}

// Organizers with upcoming events, busiest first: [{ slug, name, upcomingEvents }]
export async function fetchOrganizers(search, signal) {
    const response = await api.get('/api/organizers', { params: { search: search || undefined }, signal })
    return response.data
}

// An organizer's page: { slug, name, url, upcomingEvents, pastEvents }
export async function fetchOrganizer(slug, signal) {
    const response = await api.get(`/api/organizers/${encodeURIComponent(slug)}`, { signal })
    return response.data
}

// Admin panel: a line-up name that is really the organizer leaves the artists and gets an organizer page
export async function markAsOrganizer(name) {
    const response = await api.post('/api/admin/artists/organizer', { name })
    return response.data
}

// Editing an organizer (their owner or an admin): { slug, name, photoUrl, bio, instagramUrl, websiteUrl, events, owner }
export async function fetchOrganizerEdit(slug, signal) {
    const response = await api.get(`/api/organizers/${encodeURIComponent(slug)}/edit`, { signal })
    return response.data
}

export async function saveOrganizerProfile(slug, profile) {
    const response = await api.put(`/api/organizers/${encodeURIComponent(slug)}/profile`, profile)
    return response.data
}

// The organizer's timetable for one of their own events, and back to the line-up's set times
export async function setOrganizerTimetable(slug, eventId, sets) {
    const response = await api.put(`/api/organizers/${encodeURIComponent(slug)}/events/${eventId}/timetable`, { sets })
    return response.data
}

export async function handBackOrganizerTimetable(slug, eventId) {
    const response = await api.delete(`/api/organizers/${encodeURIComponent(slug)}/events/${eventId}/timetable`)
    return response.data
}

// The organizers whose page this account owns: [{ slug, name }]
export async function fetchMyOrganizers(signal) {
    const response = await api.get('/api/me/organizers', { signal })
    return response.data
}

// Admin panel: link an account to an organizer as its owner, or unlink it
export async function setOrganizerOwner(slug, username) {
    const response = await api.put(`/api/admin/organizers/${encodeURIComponent(slug)}/owner`, { username })
    return response.data
}

export async function removeOrganizerOwner(slug) {
    await api.delete(`/api/admin/organizers/${encodeURIComponent(slug)}/owner`)
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
export async function fetchMyOurEvents(signal) {
    const response = await api.get('/api/our-events/mine', { signal })
    return response.data
}

// Takes back an event that is still waiting for an admin
export async function withdrawOurEvent(id) {
    await api.delete(`/api/our-events/${id}`)
}

// Admins: added events with this status (PENDING, APPROVED, REJECTED), with Goabase events that may be the same
export async function fetchOurEventsForAdmin(status, signal) {
    const response = await api.get('/api/admin/our-events', { params: { status }, signal })
    return response.data
}

export async function approveOurEvent(id) {
    const response = await api.post(`/api/admin/our-events/${id}/approve`)
    return response.data
}

// Rejects a waiting event or takes down an approved one; the reason is shown to the account that sent it
export async function rejectOurEvent(id, reason) {
    const response = await api.post(`/api/admin/our-events/${id}/reject`, { reason })
    return response.data
}

// Admins: { total, verified, newThisWeek, users: [newest first, with what they use] }; search by name or email
// team: only the admins and editors
export async function fetchAdminUsers(search, team, signal) {
    const params = { ...(search ? { search } : {}), ...(team ? { team: true } : {}) }
    const response = await api.get('/api/admin/users', { params, signal })
    return response.data
}

// role: 'ADMIN', 'EDITOR' or null (a user again)
export async function setUserRole(username, role) {
    const response = await api.put('/api/admin/users/' + encodeURIComponent(username) + '/role', { role })
    return response.data
}

// "Add to calendar": the event as a .ics file, which phones and calendar apps open
export const calendarUrl = (id) => `${api.defaults.baseURL}/api/events/${id}/calendar.ics`

// Deletes a review: its author, or an admin (kept in the history)
export async function deleteReview(id) {
    await api.delete(`/api/reviews/${id}`)
}

// Admins: the newest 100 reviews of the whole site
export async function fetchNewestReviews(signal) {
    const response = await api.get('/api/admin/reviews', { signal })
    return response.data
}

// Admins: what waits for them { feedback, events, artistRequests, total }, for the number next to "Admin"
export async function fetchAdminWaiting(signal) {
    const response = await api.get('/api/admin/waiting', { signal })
    return response.data
}

// Admins: the dashboard { waiting, users, newUsersThisWeek, ships, harbour, index, mostFollowed }
export async function fetchAdminDashboard(signal) {
    const response = await api.get('/api/admin/dashboard', { signal })
    return response.data
}

// Admins: reads an event's line-up right away: { artists: [names found] }
export async function rereadLineUp(id) {
    const response = await api.post(`/api/admin/events/${id}/reread`)
    return response.data
}

// Admins: hides an event from the whole site (lists, map, artist index, reminders), with an optional reason
export async function hideEvent(id, reason) {
    const response = await api.put(`/api/admin/events/${id}/hidden`, { reason })
    return response.data
}

export async function showEvent(id) {
    await api.delete(`/api/admin/events/${id}/hidden`)
}

// Admins: the hidden events, newest first: [{ eventId, name, reason, hiddenBy, hiddenAt }]
export async function fetchHiddenEvents(signal) {
    const response = await api.get('/api/admin/events/hidden', { signal })
    return response.data
}

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

// Admins: emails an answer to a feedback message's sender; returns the message with the answer
export async function replyToFeedback(id, text) {
    const response = await api.post(`/api/admin/feedback/${id}/reply`, { text })
    return response.data
}

// Admins: features an event on the map (3 at a time, 409 past that), with an optional short note
export async function featureEvent(id, note) {
    const response = await api.put(`/api/admin/events/${id}/featured`, { note })
    return response.data
}

export async function unfeatureEvent(id) {
    await api.delete(`/api/admin/events/${id}/featured`)
}

// Admins: the featured events, newest first: [{ eventId, name, note, featuredBy, featuredAt, upcoming }]
export async function fetchFeaturedEvents(signal) {
    const response = await api.get('/api/admin/events/featured', { signal })
    return response.data
}

// An artist's numbers: { gigs: { total, upcoming, past, live, byCountry, byGenre, byYear, countedSince }, followers, followersByMonth }
export async function fetchArtistStats(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}/stats`, { signal })
    return response.data
}

// A label of the map with its crew together: { crew, crewWithGigs, gigs, followers, followersByMonth, upcoming: [gigs] }
export async function fetchLabelStats(label, signal) {
    const response = await api.get('/api/labels/stats', { params: { label }, signal })
    return response.data
}

// A festival of the map: { editions: [events named like it, with going and saved], byGenre, topArtists, reportedByYear }
// id: the festival of the map, so the editions set by hand count too
export async function fetchFestivalStats(match, id, signal) {
    const response = await api.get('/api/festivals/stats', { params: { match, id }, signal })
    return response.data
}

// Owners and admins: per gig going, saved, reviews, rating and followers reached, plus followers and totals
export async function fetchArtistOwnerStats(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}/owner-stats`, { signal })
    return response.data
}

// Owners and admins: per event going, saved, reviews, rating and how many follow someone in its line-up
export async function fetchOrganizerOwnerStats(slug, signal) {
    const response = await api.get(`/api/organizers/${encodeURIComponent(slug)}/owner-stats`, { signal })
    return response.data
}

// ---- Labels and festivals with owners ----

// A label's page: { name, profile: { description, logoUrl, websiteUrl, bandcampUrl, instagramUrl } | null, crew: [names] }
export async function fetchLabelPage(label, signal) {
    const response = await api.get('/api/labels/page', { params: { label }, signal })
    return response.data
}

// The label's edit page (owner or admin): page + pending crew requests + owner (admins only)
export async function fetchLabelEdit(label, signal) {
    const response = await api.get('/api/labels/edit', { params: { label }, signal })
    return response.data
}

export async function saveLabelProfile(label, profile) {
    const response = await api.put('/api/labels/profile', profile, { params: { label } })
    return response.data
}

// kind ADD or REMOVE; an admin decides (an admin's own is done at once). Returns the crew as it is now
export async function requestLabelCrew(label, kind, artistName) {
    const response = await api.post('/api/labels/requests', { kind, artistName }, { params: { label } })
    return response.data
}

export async function fetchLabelOwnerStats(label, signal) {
    const response = await api.get('/api/labels/owner-stats', { params: { label }, signal })
    return response.data
}

export async function fetchMyLabels(signal) {
    const response = await api.get('/api/me/labels', { signal })
    return response.data
}

// A festival's page: { id, name, profile: { description, websiteUrl, ticketUrl, instagramUrl, organizerSlug } | null, organizer }
export async function fetchFestivalPage(id, signal) {
    const response = await api.get('/api/festivals/page', { params: { id }, signal })
    return response.data
}

export async function fetchFestivalEdit(id, signal) {
    const response = await api.get('/api/festivals/edit', { params: { id }, signal })
    return response.data
}

export async function saveFestivalProfile(id, profile) {
    const response = await api.put('/api/festivals/profile', profile, { params: { id } })
    return response.data
}

export async function fetchFestivalOwnerStats(id, signal) {
    const response = await api.get('/api/festivals/owner-stats', { params: { id }, signal })
    return response.data
}

export async function fetchMyFestivals(signal) {
    const response = await api.get('/api/me/festivals', { signal })
    return response.data
}

// Admins: link or unlink the owner of a label or a festival
export async function setLabelOwner(label, username) {
    await api.put('/api/admin/labels/owner', { username }, { params: { label } })
}

export async function removeLabelOwner(label) {
    await api.delete('/api/admin/labels/owner', { params: { label } })
}

export async function setFestivalOwner(id, username) {
    await api.put('/api/admin/festivals/owner', { username }, { params: { id } })
}

export async function removeFestivalOwner(id) {
    await api.delete('/api/admin/festivals/owner', { params: { id } })
}

// Admins: the label owners' waiting crew requests, and deciding one
export async function fetchLabelRequests(signal) {
    const response = await api.get('/api/admin/labels/requests', { signal })
    return response.data
}

export async function decideLabelRequest(id, approve) {
    await api.post(`/api/admin/labels/requests/${id}`, { approve })
}

// "Claim this page" (kind ARTIST, ORGANIZER, LABEL or FESTIVAL): { status: APPROVED (theirs now) or PENDING, ... }
export async function claimPage(kind, target, proofUrl, message, website) {
    const response = await api.post('/api/claims', { kind, target, proofUrl, message, website })
    return response.data
}

// The claims this account sent, newest first
export async function fetchMyClaims(signal) {
    const response = await api.get('/api/me/claims', { signal })
    return response.data
}

// Admins: the claims waiting for a decision, and deciding one
export async function fetchPageClaims(signal) {
    const response = await api.get('/api/admin/claims', { signal })
    return response.data
}

export async function decidePageClaim(id, approve, reason) {
    const response = await api.post(`/api/admin/claims/${id}`, { approve, reason })
    return response.data
}

// "Not on the map yet?": ask for a page the site doesn't have (kind, name, country, websiteUrl, proofUrl, genres, message)
export async function askForPage(request) {
    const response = await api.post('/api/page-requests', request)
    return response.data
}

// The pages this account asked for, newest first
export async function fetchMyPageRequests(signal) {
    const response = await api.get('/api/me/page-requests', { signal })
    return response.data
}

// For admins: the new page requests waiting for a decision
export async function fetchNewPageRequests(signal) {
    const response = await api.get('/api/admin/page-requests', { signal })
    return response.data
}

// onTheMap: for a label or festival, { country, since, description, genres } to put it on the map right away
export async function decideNewPageRequest(id, approve, reason, onTheMap) {
    const response = await api.post('/api/admin/page-requests/' + id, { approve, reason, onTheMap })
    return response.data
}

// For editors and admins: edition true (an edition of the festival), false (not one), null (go by the name again)
export async function setFestivalEdition(eventId, festivalId, edition) {
    await api.put('/api/admin/events/' + eventId + '/festival-edition', { festivalId, edition })
}
