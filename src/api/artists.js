// Artists: lists, profiles, follows, editing your own page and its numbers
import api from './client.js'

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

// An artist's numbers: { gigs: { total, upcoming, past, live, byCountry, byGenre, byYear, countedSince }, followers, followersByMonth }
export async function fetchArtistStats(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}/stats`, { signal })
    return response.data
}

// Owners and admins: per gig going, saved, reviews, rating and followers reached, plus followers and totals
export async function fetchArtistOwnerStats(slug, signal) {
    const response = await api.get(`/api/artists/${encodeURIComponent(slug)}/owner-stats`, { signal })
    return response.data
}
