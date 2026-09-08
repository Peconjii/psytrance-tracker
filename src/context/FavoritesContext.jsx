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
                setFavorites(response.data)
            } catch (err) {
                console.error("Failed to fetch favorites:", err)
            }
        }

        fetchFavorites()
    }, [user?.id, token])

    async function addFavorite(eventId, eventName, userId) {
        const activeUserId = userId || user?.id
        if (!activeUserId) return

        try {
            console.log("Adding favorite for user:", activeUserId)
            await api.post(`/api/favorites/${activeUserId}`, null, {
                params: { eventId, eventName }
            })
            const response = await api.get(`/api/favorites/${activeUserId}`)
            setFavorites(response.data)
        } catch (err) {
            console.error("Failed to add favorite:", err)
        }
    }

    async function removeFavorite(eventId, userId) {
        const activeUserId = userId || user?.id
        if (!activeUserId) return

        try {
            await api.delete(`/api/favorites/${activeUserId}`, {
                params: { eventId }
            })
            const response = await api.get(`/api/favorites/${activeUserId}`)
            setFavorites(response.data)
        } catch (err) {
            console.error("Failed to remove favorite:", err)
        }
    }

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite }}>
            {children}
        </FavoritesContext.Provider>
    )
}

export function useFavorites() {
    return useContext(FavoritesContext)
}

export { FavoritesContext }