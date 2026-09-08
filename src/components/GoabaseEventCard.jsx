import { useContext, useState } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import EventMap from './EventMap'

function GoabaseEventCard({ event }) {
    const { favorites, addFavorite, removeFavorite } = useContext(FavoritesContext)
    const { user } = useAuth()
    const [showMap, setShowMap] = useState(false)
    
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
        <div className="flex flex-col justify-between bg-gray-700 rounded-xl overflow-hidden shadow-lg p-2">
            <div>
                {event.urlImageMedium ? (
                    <img src={event.urlImageMedium} alt={event.nameParty || 'Event image'} className="w-full h-48 object-cover rounded-t-lg" />
                ) : (
                    <div className="w-full h-48 bg-gray-600 flex items-center justify-center rounded-t-lg">
                        <span className="text-gray-400">No image available</span>
                    </div>
                )}
                
                <div className="text-center p-3">
                    <h2 className="p-2 text-white text-xl font-bold">{event.nameParty || 'Untitled Event'}</h2>
                    {user && (
                        <button onClick={toggleFavorite} className="text-2xl cursor-pointer hover:scale-110 transition-transform">
                            {isFavorite ? "❤️" : "🤍"}
                        </button>
                    )}
                    <p className="text-gray-300 mt-1">{event.nameTown || 'Unknown Town'}, {event.nameCountry || ''}</p>
                    <p className="text-gray-400 text-sm mt-1">{event.dateStart ? event.dateStart.split('T')[0] : 'TBA'}</p>
                    <span className="inline-block bg-purple-900 text-purple-300 text-xs px-2 py-1 rounded-full mt-2">{event.nameType || 'Party'}</span>
                </div>
            </div>

            {showMap && (
                <div className="px-2 py-1">
                    <EventMap 
                        lat={event.lat} 
                        lon={event.lon} 
                        partyName={event.nameParty} 
                        locationName={`${event.nameTown}, ${event.nameCountry}`} 
                    />
                </div>
            )}

            <div className="flex justify-around items-center p-3 border-t border-gray-600 mt-2">
                <button 
                    onClick={() => setShowMap(!showMap)} 
                    className="text-sm bg-gray-600 hover:bg-gray-500 text-cyan-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                    {showMap ? "Hide Map 📍" : "Show Map 📍"}
                </button>

                <a 
                    href={event.urlPartyHtml || '#'} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                    View Event ↗
                </a>
            </div>
        </div>
    )
}

export default GoabaseEventCard