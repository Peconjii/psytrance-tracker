import axios from "axios"
const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY

async function fetchEvents() {
    console.log("API KEY je:", API_KEY)
    const response = await axios.get('/api/discovery/v2/events.json' , {
        params: {
            keyword: "electronic, trance, dance",
            apikey: API_KEY
        }
    })
    console.log(response.data)
    console.log(API_KEY)
    return response.data._embedded.events
}

export default fetchEvents