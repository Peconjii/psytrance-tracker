import { useState, useEffect } from 'react'
import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import { fetchEventById } from '../api/ticketmaster'
import EventCard from './EventCard'

function FavoriteCard({ favorite }) {
    const [event, setEvent] = useState(null)

    useEffect(() => {
        async function loadEvent() {
            const data = await fetchEventById(favorite.eventId)
            setEvent(data)
        }
        loadEvent()
    }, [favorite.eventId])

    if (!event) return <p className="text-white text-center">Loading...</p>

    return <EventCard events={event} />
}

export default FavoriteCard