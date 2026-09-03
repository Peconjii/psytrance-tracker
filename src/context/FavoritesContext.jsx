import { useEffect, createContext, useState, useContext } from "react"
import { useAuth } from "./AuthContext"
import api from "../api/backend"

const FavoritesContext = createContext()

function FavoritesProvider({ children }) {
    const [favorites, setFavorites] = useState([])
    const { user } = useAuth()

    useEffect(() => {
        if (user) {
            api.get(`/api/favorites/${user.id}`)
                .then(response => setFavorites(response.data))
                .catch(err => console.log(err))
        } else {
            setFavorites([])
        }
    }, [user])

    async function addFavorite(eventId, eventName) {
        await api.post(`/api/favorites/${user.id}`, null, {
            params: { eventId, eventName }
        })
        const response = await api.get(`/api/favorites/${user.id}`)
        setFavorites(response.data)
    }

    async function removeFavorite(eventId) {
        await api.delete(`/api/favorites/${user.id}`, {
            params: { eventId }
        })
        const response = await api.get(`/api/favorites/${user.id}`)
        setFavorites(response.data)
    }

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite }}>
            {children}
        </FavoritesContext.Provider>
    )
}

export { FavoritesContext, FavoritesProvider }