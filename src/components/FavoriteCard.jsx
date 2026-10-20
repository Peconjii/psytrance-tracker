import { useState, useEffect } from 'react'
import { fetchEventById, fetchGenresForEvents, fetchGoing } from '../api/backend'
import { fetchWeatherForEvents, weatherKey } from '../api/weather'
import EventTicket from './EventTicket'

function FavoriteCard({ favorite }) {
    const [event, setEvent] = useState(null)
    const [weather, setWeather] = useState(null)
    const [going, setGoing] = useState(null)
    const [genres, setGenres] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadEvent() {
            try {
                const data = await fetchEventById(favorite.eventId)
                setEvent(data)
                // Not awaited, so the card shows right away and the weather badge appears when ready
                fetchWeatherForEvents([data]).then(found => setWeather(found[weatherKey(data)]))
                fetchGoing(data.id).then(setGoing)
                fetchGenresForEvents([data]).then(found => setGenres(found[data.id] || []))
            } catch (err) {
                console.error("Error loading favorite event:", err)
            } finally {
                setLoading(false)
            }
        }

        if (favorite?.eventId) {
            loadEvent()
        }
    }, [favorite.eventId])

    if (loading) return <div className="ticket skeleton h-28" aria-busy="true" />
    if (!event) return null

    return <EventTicket event={event} weather={weather} going={going} genres={genres} onGoingChange={setGoing} />
}

export default FavoriteCard