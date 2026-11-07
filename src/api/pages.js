// Organizer, label and festival pages: profiles, follows, editing, claims and new pages
import api from './client.js'

// Every label of the map: [{ label, crew, upcomingGigs, followers }]
export async function fetchLabelsOverview(signal) {
    const response = await api.get('/api/labels/overview', { signal })
    return response.data
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

// Organizers with upcoming events, busiest first: [{ slug, name, upcomingEvents }]
// Where one of the organizer's own events flies on the map (its genres, up to 4; [] = read from the line-up again)
export async function setOrganizerEventGenres(slug, eventId, genres) {
    const response = await api.put(`/api/organizers/${encodeURIComponent(slug)}/events/${eventId}/genres`, { genres })
    return response.data
}

export async function fetchOrganizers(search, signal) {
    const response = await api.get('/api/organizers', { params: { search: search || undefined }, signal })
    return response.data
}

// An organizer's page: { slug, name, url, upcomingEvents, pastEvents }
export async function fetchOrganizer(slug, signal) {
    const response = await api.get(`/api/organizers/${encodeURIComponent(slug)}`, { signal })
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

// Uploads a picture (a Blob, already made small by ImageField) and returns its address, to put in a picture field
export async function uploadImage(blob) {
    const form = new FormData()
    form.append('file', blob, 'picture')
    const response = await api.post('/api/images', form)
    return response.data.url
}

// Artists or organizers (kind: 'artists' | 'organizers') with their own page and no upcoming event yet, newest first:
// [{ slug, name, photoUrl, role }]
export async function fetchNewPages(kind, search, signal) {
    const response = await api.get(`/api/${kind}/new-pages`, { params: { search: search || undefined }, signal })
    return response.data
}

// A trusted festival owner marks an event as an edition (true), as not one (false) or back to its name (null)
export async function setOwnFestivalEdition(festivalId, eventId, edition) {
    await api.put('/api/festivals/editions', { eventId, edition }, { params: { id: festivalId } })
}
