import { useState, useEffect, useContext } from 'react'
import { useAuth } from '../context/AuthContext'
import { FavoritesContext } from '../context/FavoritesContext'
import ReviewSection from './ReviewSection'
import EventMap from './EventMap'

function GoabaseEventCard({ event }) {
    const { user } = useAuth()
    const favoritesContext = useContext(FavoritesContext)
    const favorites = favoritesContext?.favorites || []

    const [weather, setWeather] = useState(null)
    const [showReviews, setShowReviews] = useState(false)
    const [showMap, setShowMap] = useState(false)

    const eventLat = event?.parsedLat || event?.lat || event?.geoLat || null
    const eventLon = event?.parsedLon || event?.lon || event?.geoLon || null

    const isFavorite = favorites.some(fav => String(fav.eventId || fav.id) === String(event.id))

    const baseId = Number(event.id) || 100
    const initialGoing = (baseId % 40) + 5
    const initialInterested = (baseId % 85) + 12

    const [attendance, setAttendance] = useState({ going: initialGoing, interested: initialInterested })
    const [userStatus, setUserStatus] = useState(null)

    // Optimizovan fetch prognoze sa Cache-om u sessionStorage i AbortController-om radi sprečavanja 429 error-a
    useEffect(() => {
        const lat = event?.parsedLat || event?.lat || event?.geoLat
        const lon = event?.parsedLon || event?.lon || event?.geoLon

        if (!lat || !lon) return

        // Skraćujemo koordinate na 1 decimalu radi grupisanja i smanjenja poziva
        const cacheKey = `weather_${Number(lat).toFixed(1)}_${Number(lon).toFixed(1)}`
        const cachedData = sessionStorage.getItem(cacheKey)

        if (cachedData) {
            try {
                setWeather(JSON.parse(cachedData))
                return
            } catch (e) {
                sessionStorage.removeItem(cacheKey)
            }
        }

        const controller = new AbortController()
        
        // Dodajemo mali nasumični timeout da razbijemo istovremene zahteve ka Open-Meteo serveru
        const timeoutId = setTimeout(() => {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, {
                signal: controller.signal
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP status ${res.status}`)
                    return res.json()
                })
                .then(data => {
                    if (data.current_weather) {
                        setWeather(data.current_weather)
                        sessionStorage.setItem(cacheKey, JSON.stringify(data.current_weather))
                    }
                })
                .catch(err => {
                    if (err.name !== 'AbortError') {
                        // Tiho zanemarujemo greške u konzoli da ne opterećujemo log
                    }
                })
        }, Math.random() * 800)

        return () => {
            clearTimeout(timeoutId)
            controller.abort()
        }
    }, [event])

    const handleToggleFavorite = () => {
        if (typeof favoritesContext?.toggleFavorite === 'function') {
            favoritesContext.toggleFavorite(event)
        } else if (isFavorite && typeof favoritesContext?.removeFavorite === 'function') {
            favoritesContext.removeFavorite(event.id)
        } else if (!isFavorite && typeof favoritesContext?.addFavorite === 'function') {
            favoritesContext.addFavorite(event)
        }
    }

    const handleAttendance = (type) => {
        if (!user) return alert("Prijavi se da označiš dolazak!")
        
        if (userStatus === type) {
            setUserStatus(null)
            setAttendance(prev => ({ ...prev, [type]: prev[type] - 1 }))
        } else {
            if (userStatus) {
                setAttendance(prev => ({ ...prev, [userStatus]: prev[userStatus] - 1 }))
            }
            setUserStatus(type)
            setAttendance(prev => ({ ...prev, [type]: prev[type] + 1 }))
        }
    }

    const shareText = encodeURIComponent(`Hej! Pogledaj ovaj psytrance događaj: ${event.nameParty} u mestu ${event.nameTown}! 🛸`)
    const shareUrl = encodeURIComponent(event.urlPartyHtml || window.location.href)

    // Pouzdaniji fallback url za sliku preko placehold.co
    const fallbackImage = 'https://placehold.co/400x200/0f172a/06b6d4?text=Psytrance+Gathering'

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-4 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all relative group">
            
            <div>
                {/* Slika Događaja sa Weather Badge-om i Neonskim Srce Dugmetom */}
                <div className="relative h-40 w-full rounded-2xl overflow-hidden mb-3 border border-slate-800 bg-slate-950">
                    <img 
                        src={event.urlImageMedium || event.urlImage || fallbackImage} 
                        alt={event.nameParty} 
                        onError={(e) => { e.target.onerror = null; e.target.src = fallbackImage }}
                        className="w-full h-full object-cover"
                    />

                    {/* Neonsko Srce Dugme */}
                    <button
                        onClick={handleToggleFavorite}
                        className={`absolute top-2 left-2 p-2 rounded-xl backdrop-blur-md border transition-all duration-300 cursor-pointer z-10 ${
                            isFavorite
                                ? 'bg-rose-950/80 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] scale-110'
                                : 'bg-slate-950/70 border-slate-700/80 text-slate-400 hover:border-rose-400 hover:text-rose-400 hover:scale-105'
                        }`}
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

                    {/* Weather Badge */}
                    {weather && (
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-1 shadow-md">
                            <span>🌡️ {Math.round(weather.temperature)}°C</span>
                        </div>
                    )}
                </div>

                {/* Naslov i Lokacija */}
                <h3 className="font-bold text-base text-white line-clamp-1 mb-1" title={event.nameParty}>
                    {event.nameParty}
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                    {event.nameTown}, <strong className="text-cyan-400">{event.nameCountry}</strong>
                </p>
                <p className="text-xs text-purple-400 font-semibold mb-3">
                    📅 {event.dateStart?.split('T')[0]}
                </p>
            </div>

            {/* Bottom Actions: Attendance & Share */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs gap-1">
                    <button 
                        onClick={() => handleAttendance('going')}
                        className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex-1 text-center ${
                            userStatus === 'going' 
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold' 
                                : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                    >
                        🚀 Going ({attendance.going})
                    </button>
                    <button 
                        onClick={() => handleAttendance('interested')}
                        className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex-1 text-center ${
                            userStatus === 'interested' 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold' 
                                : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                    >
                        ⭐ Interested ({attendance.interested})
                    </button>
                </div>


                <div className="flex gap-2 mt-1">
                    <button
                        onClick={() => setShowMap(prev => !prev)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            showMap
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:text-white hover:border-cyan-500/40'
                        }`}
                    >
                        📍 {showMap ? 'Hide Map' : 'Map'}
                    </button>
                    <button
                        onClick={() => setShowReviews(prev => !prev)}
                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            showReviews
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:text-white hover:border-cyan-500/40'
                        }`}
                    >
                        💬 {showReviews ? 'Hide Reviews' : 'Reviews'}
                    </button>
                </div>

                {showMap && (
                    <EventMap
                        lat={eventLat}
                        lon={eventLon}
                        partyName={event.nameParty}
                        locationName={[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}
                    />
                )}

                {showReviews && <ReviewSection eventId={event.id} />}
                <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Quick Share:</span>
                    <div className="flex gap-2">
                        <a
                            href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs"
                            title="Share on WhatsApp"
                        >
                            💬 WA
                        </a>
                        <a
                            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-xs"
                            title="Share on Telegram"
                        >
                            ✈️ TG
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GoabaseEventCard