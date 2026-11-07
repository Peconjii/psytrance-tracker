// The galaxy: genre texts, where artists sit, main genres, labels and festivals on the map
import api from './client.js'

// Which artists orbit which genre on the map: { genreId: [artist names] }
// Each genre's texts and key tracks: { goa: { description, bass, kick, atmosphere, year, bpmMin, bpmMax, verified, tracks } }
export async function fetchGalaxyContent(signal) {
    const response = await api.get('/api/map/content', { signal })
    return response.data
}

// A genre's content for Admin -> Galaxy, and saving it (the whole content at once)
export async function fetchGenreContent(genreId) {
    const response = await api.get(`/api/admin/map/content/${genreId}`)
    return response.data
}

export async function fetchPlacements(signal) {
    const response = await api.get('/api/map/placements', { signal })
    return response.data
}

// { artist name: genre id }: the one star each artist orbits (their main genre)
export async function fetchMainGenres(signal) {
    const response = await api.get('/api/map/main-genres', { signal })
    return response.data
}

// The labels and festivals admins added to the map: { labels: [{ name, country, since, genres, x, y }], festivals: [...] }
// Labels and festivals whose map details someone changed (name, country, year, description, genres)
export async function fetchMapDetails(signal) {
    const response = await api.get('/api/map/details', { signal })
    return response.data
}

// One label's or festival's changed details, and whether this account may change them (kind: LABEL or FESTIVAL)
export async function fetchStationDetails(kind, key, signal) {
    const response = await api.get(`/api/map/details/${kind}`, { params: { key }, signal })
    return response.data
}

export async function saveStationDetails(kind, key, details) {
    const response = await api.put(`/api/map/details/${kind}`, details, { params: { key } })
    return response.data
}

export async function fetchMapExtras(signal) {
    const response = await api.get('/api/map/extras', { signal })
    return response.data
}

// Genres (stars) admins added to the galaxy, drawn next to the ones in genres.json
export async function fetchAddedGenres(signal) {
    const response = await api.get('/api/map/added-genres', { signal })
    return response.data
}

// Artists' country, first year and albums (artist slug -> discography), and every set at a festival station
export async function fetchDiscography(signal) {
    const response = await api.get('/api/map/discography', { signal })
    return response.data
}

export async function fetchFestivalSets(signal) {
    const response = await api.get('/api/map/sets', { signal })
    return response.data
}
