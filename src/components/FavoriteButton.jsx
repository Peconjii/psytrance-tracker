import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FavoritesContext } from '../context/FavoritesContext'

// Heart toggle used on event cards and the event page; position it with `className`
function FavoriteButton({ event, className = '' }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const favoritesContext = useContext(FavoritesContext)
    const favorites = favoritesContext?.favorites || []

    const isFavorite = favorites.some(fav => String(fav.eventId) === String(event.id))

    const handleToggleFavorite = () => {
        // Favorites are saved per account, so guests are sent to log in first
        if (!user) return navigate('/login')
        favoritesContext.toggleFavorite(event)
    }

    return (
        <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all duration-300 cursor-pointer ${
                isFavorite
                    ? 'bg-rose-950/80 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-110'
                    : 'bg-slate-950/70 border-slate-700/80 text-slate-400 hover:border-rose-400 hover:text-rose-400 hover:scale-105'
            } ${className}`}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 transition-colors"
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        </button>
    )
}

export default FavoriteButton
