// Admin panel: inbox, requests, users, history and every change only editors and admins can make
import api from './client.js'

// Admins only: all feedback newest first, or only one status (NEW, IN_PROGRESS, DONE, REJECTED)
export async function fetchFeedback(status, signal) {
    const response = await api.get('/api/admin/feedback', { params: status ? { status } : {}, signal })
    return response.data
}

export async function setFeedbackStatus(id, status) {
    const response = await api.patch(`/api/admin/feedback/${id}`, { status })
    return response.data
}

export async function saveGenreContent(genreId, content) {
    const response = await api.put(`/api/admin/map/content/${genreId}`, content)
    return response.data
}

// For admins: put a label ({ name, country, since, genres }) or festival (also { description }) on the map
export async function addMapLabel(label) {
    const response = await api.post('/api/admin/map/labels', label)
    return response.data
}

// For admins: take a label or festival added from the panel off the map again
export async function removeMapLabel(name) {
    await api.delete('/api/admin/map/labels', { params: { name } })
}

export async function removeMapFestival(id) {
    await api.delete('/api/admin/map/festivals', { params: { id } })
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

// Admin panel: a line-up name that is really the organizer leaves the artists and gets an organizer page
export async function markAsOrganizer(name) {
    const response = await api.post('/api/admin/artists/organizer', { name })
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

// Admin: deletes an account for good (what stays on the site: see the backend's UserDeletion)
export async function deleteUser(username) {
    const response = await api.delete('/api/admin/users/' + encodeURIComponent(username))
    return response.data
}

// role: 'ADMIN', 'EDITOR' or null (a user again)
export async function setUserRole(username, role) {
    const response = await api.put('/api/admin/users/' + encodeURIComponent(username) + '/role', { role })
    return response.data
}

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

// Admins: the claims waiting for a decision, and deciding one
export async function fetchPageClaims(signal) {
    const response = await api.get('/api/admin/claims', { signal })
    return response.data
}

export async function decidePageClaim(id, approve, reason, trusted = false) {
    const response = await api.post(`/api/admin/claims/${id}`, { approve, reason, trusted })
    return response.data
}

// For admins: the new page requests waiting for a decision
export async function fetchNewPageRequests(signal) {
    const response = await api.get('/api/admin/page-requests', { signal })
    return response.data
}

// onTheMap: for a label or festival, { country, since, description, genres } to put it on the map right away
export async function decideNewPageRequest(id, approve, reason, onTheMap, trusted = false) {
    const response = await api.post('/api/admin/page-requests/' + id, { approve, reason, onTheMap, trusted })
    return response.data
}

// For editors and admins: edition true (an edition of the festival), false (not one), null (go by the name again)
export async function setFestivalEdition(eventId, festivalId, edition) {
    await api.put('/api/admin/events/' + eventId + '/festival-edition', { festivalId, edition })
}

// Trust in a page's owner (kind: ARTIST | ORGANIZER | LABEL | FESTIVAL; key: slug, label name or festival id):
// { owner, trusted }. A trusted owner's changes to their own page go live without an admin. For the owner and admins.
export async function fetchPageTrust(kind, key, signal) {
    const response = await api.get('/api/me/page-trust', { params: { kind, key }, signal })
    return response.data
}

// Admins only
export async function setPageTrust(kind, key, trusted) {
    const response = await api.put('/api/admin/page-trust', { kind, key, trusted })
    return response.data
}
