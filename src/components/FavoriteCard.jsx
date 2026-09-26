import { useState, useEffect } from 'react'
import { fetchEventById } from '../api/backend'
import { fetchWeatherForEvents, weatherKey } from '../api/weather'
import GoabaseEventCard from './GoabaseEventCard'

function FavoriteCard({ favorite }) {
    const [event, setEvent] = useState(null)
    const [weather, setWeather] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadEvent() {
            try {
                const data = await fetchEventById(favorite.eventId)
                setEvent(data)
                // Not awaited, so the card shows right away and the weather badge appears when ready
                fetchWeatherForEvents([data]).then(found => setWeather(found[weatherKey(data)]))
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

    if (loading) return <p className="text-white text-center">Loading favorite...</p>
    if (!event) return null

    return <GoabaseEventCard event={event} weather={weather} />
}

export default FavoriteCard