import axios from "axios"
const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY

async function fetchEvents() {
    const response = await axios.get('/api/discovery/v2/events.json', {
        params: {
            keyword: "electronic, trance, dance",
            apikey: API_KEY
        }
    })
    return response.data._embedded.events
}

export async function fetchEventById(eventId) {
    const response = await axios.get(`/api/discovery/v2/events/${eventId}`, {
        params: {
            apikey: API_KEY
        }
    })
    return response.data
}

export default fetchEvents