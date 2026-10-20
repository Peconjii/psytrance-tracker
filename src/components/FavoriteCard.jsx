import { useState, useEffect } from 'react'
import { fetchEventById, fetchGoing } from '../api/backend'
import { fetchWeatherForEvents, weatherKey } from '../api/weather'
import EventRow from './EventRow'

function FavoriteCard({ favorite }) {
    const [event, setEvent] = useState(null)
    const [weather, setWeather] = useState(null)
    const [going, setGoing] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadEvent() {
            try {
                const data = await fetchEventById(favorite.eventId)
                setEvent(data)
                // Not awaited, so the card shows right away and the weather badge appears when ready
                fetchWeatherForEvents([data]).then(found => setWeather(found[weatherKey(data)]))
                fetchGoing(data.id).then(setGoing)
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

    if (loading) return <div className="board__row"><div className="skeleton h-10 col-span-4" /></div>
    if (!event) return null

    return <EventRow event={event} weather={weather} going={going} onGoingChange={setGoing} />
}

export default FavoriteCard