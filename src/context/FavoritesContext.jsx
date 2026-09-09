import { useEffect, createContext, useState, useContext } from "react"
import { useAuth } from "./AuthContext"
import api from "../api/backend"

const FavoritesContext = createContext()

export function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState([])
    const { user, token } = useAuth()

    useEffect(() => {
        if (!user?.id || !token) {
            setFavorites([])
            return
        }

        async function fetchFavorites() {
            try {
                const response = await api.get(`/api/favorites/${user.id}`)
                setFavorites(response.data || [])
            } catch (err) {
                console.error("Failed to fetch favorites:", err)
            }
        }

        fetchFavorites()
    }, [user?.id, token])

    async function addFavorite(event) {
        const activeUserId = user?.id
        if (!activeUserId) return alert("Prijavi se da dodaš u omiljene!")

        // Pripremamo ID i ime bez obzira da li je prosleđen ceo objekat ili pojedinačni string
        const eventId = String(event?.id || event)
        const eventName = event?.nameParty || event?.name || event?.eventName || 'Untitled Event'

        try {
            // Šaljemo čist JSON body ka bekendu
            const response = await api.post(`/api/favorites/${activeUserId}`, {
                eventId,
                eventName
            })

            // Ažuriramo stanje sa novim favoritom sa bekenda
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
            setFavorites(prev => prev.filter(fav => String(fav.eventId) !== idTarget && String(fav.id) !== idTarget))
        } catch (err) {
            console.error("Failed to remove favorite:", err)
        }
    }

    function toggleFavorite(event) {
        const targetId = String(event?.id || event)
        const isFav = favorites.some(fav => String(fav.eventId) === targetId || String(fav.id) === targetId)

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