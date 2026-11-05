// The whole site: feedback and search
import api from './client.js'

// Feedback form. Throws on failure; the backend's { message } (and { errors } for invalid fields) is in err.response.data
export async function sendFeedback(feedback) {
    const response = await api.post('/api/feedback', feedback)
    return response.data
}

// The site's search box: { artists, organizers, events, labels, festivals } whose name has the words in it
export async function searchSite(q, signal) {
    const response = await api.get('/api/search', { params: { q }, signal })
    return response.data
}
