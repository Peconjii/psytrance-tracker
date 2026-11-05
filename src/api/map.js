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
export async function fetchMapExtras(signal) {
    const response = await api.get('/api/map/extras', { signal })
    return response.data
}
