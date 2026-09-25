import { useEffect, createContext, useState, useContext } from "react"
import { useAuth } from "./AuthContext"
import api from "../api/backend"

const FavoritesContext = createContext()

export function FavoritesProvider({ children }) {
    const { user, token } = useAuth()
    // Remember whose favorites were loaded, so after logout/login another user's list is never shown
    const [loaded, setLoaded] = useState({ userId: null, items: [] })
    const favorites = user?.id && token && loaded.userId === user.id ? loaded.items : []
    const setFavorites = (update) => setLoaded(prev => ({ ...prev, items: update(prev.items) }))

    useEffect(() => {
        if (!user?.id || !token) return

        async function fetchFavorites() {
            try {
                const response = await api.get(`/api/favorites/${user.id}`)
                setLoaded({ userId: user.id, items: response.data || [] })
            } catch (err) {
                console.error("Failed to fetch favorites:", err)
            }
        }

        fetchFavorites()
    }, [user?.id, token])

    async function addFavorite(event) {
        // Guests never get here: the event card sends them to /login first
        const activeUserId = user?.id
        if (!activeUserId) return

        // Accepts a whole event object or just its id
        const eventId = String(event?.id || event)
        const eventName = event?.nameParty || event?.name || event?.eventName || 'Untitled Event'

        try {
            const response = await api.post(`/api/favorites/${activeUserId}`, {
                eventId,
                eventName
            })
            setFavorites(prev => [...prev, response.data])
        } catch (err) {
            console.error("Failed to add favorite:", err)
        }
    }

    async function removeFavorite(eventId) {
        const activeUserId = user?.id
        if (!activeUserId) return

        const idTarget = String(eventId?.id || eventId)

        try {
            await api.delete(`/api/favorites/${activeUserId}`, {
                params: { eventId: idTarget }
            })
            setFavorites(prev => prev.filter(fav => String(fav.eventId) !== idTarget))
        } catch (err) {
            console.error("Failed to remove favorite:", err)
        }
    }

    function toggleFavorite(event) {
        const targetId = String(event?.id || event)
        // Compare event ids only: fav.id is the database row id and could equal an unrelated event's id
        const isFav = favorites.some(fav => String(fav.eventId) === targetId)

        if (isFav) {
            removeFavorite(targetId)
        } else {
            addFavorite(event)
        }
    }

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    )
}

export function useFavorites() {
    return useContext(FavoritesContext)
}

export { FavoritesContext }