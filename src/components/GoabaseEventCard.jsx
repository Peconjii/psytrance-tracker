import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'

function GoabaseEventCard({ event }) {
    const { favorites, addFavorite, removeFavorite } = useContext(FavoritesContext)
    const { user } = useAuth()
    
    // Guard clause: Return early if event is null or undefined
    if (!event) return null;

    const isFavorite = favorites.some(fav => fav.eventId === String(event.id))

    function toggleFavorite() {
        if (!user) {
            alert('Please login!')
            return
        }
        if (isFavorite) {
            removeFavorite(String(event.id), user.id)
        } else {
            addFavorite(String(event.id), event.nameParty || 'Untitled Event', user.id)
        }
    }

    return (
        <div className="flex-col justify-center bg-gray-700 rounded-xl overflow-hidden">
            {event.urlImageMedium ? (
                <img src={event.urlImageMedium} alt={event.nameParty || 'Event image'} className="w-full h-48 object-cover" />
            ) : (
                <div className="w-full h-48 bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                </div>
            )}
            <div className="text-center p-3">
                <h2 className="p-2 text-white text-xl">{event.nameParty || 'Untitled Event'}</h2>
                {user && (
                    <button onClick={toggleFavorite} className="text-2xl cursor-pointer">
                        {isFavorite ? "❤️" : "🤍"}
                    </button>
                )}
                <p className="text-gray-300">{event.nameTown || 'Unknown Town'}, {event.nameCountry || ''}</p>
                <p className="text-gray-400 text-sm">{event.dateStart ? event.dateStart.split('T')[0] : 'TBA'}</p>
                <span className="text-purple-400 text-sm">{event.nameType || 'Party'}</span>
                <div className="mt-2">
                    <a href={event.urlPartyHtml || '#'} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300">
                        View Event
                    </a>
                </div>
            </div>
        </div>
    )
}

export default GoabaseEventCard