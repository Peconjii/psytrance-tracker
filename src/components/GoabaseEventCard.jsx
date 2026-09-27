import { useState } from 'react'
import { Link } from 'react-router-dom'
import ReviewSection from './ReviewSection'
import EventMap from './EventMap'
import FavoriteButton from './FavoriteButton'
import ShareLinks from './ShareLinks'

const FALLBACK_IMAGE = 'https://placehold.co/400x200/0f172a/06b6d4?text=Psytrance+Gathering'

// `weather` is fetched by the parent for all its cards in one request (see api/weather.js)
function GoabaseEventCard({ event, weather }) {
    const eventLat = event?.parsedLat || event?.lat || event?.geoLat || null
    const eventLon = event?.parsedLon || event?.lon || event?.geoLon || null

    const [showReviews, setShowReviews] = useState(false)
    const [showMap, setShowMap] = useState(false)

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-4 flex flex-col justify-between shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-400/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all relative group">

            {/* Outside the link below: a button can't sit inside an <a> */}
            <FavoriteButton event={event} className="absolute top-6 left-6 z-10" />

            {/* The card's event is passed along so the event page can show it before its details load */}
            <Link to={`/events/${event.id}`} state={{ event }} className="block">
                <div className="relative h-40 w-full rounded-2xl overflow-hidden mb-3 border border-slate-800 bg-slate-950">
                    <img
                        src={event.urlImageMedium || event.urlImage || FALLBACK_IMAGE}
                        alt={event.nameParty}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Weather Badge */}
                    {weather && (
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-1 shadow-md">
                            <span>🌡️ {Math.round(weather.temperature)}°C</span>
                        </div>
                    )}
                </div>

                <h3 className="font-bold text-base text-white line-clamp-1 mb-1 group-hover:text-cyan-300 transition-colors" title={event.nameParty}>
                    {event.nameParty}
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                    {event.nameTown}, <strong className="text-cyan-400">{event.nameCountry}</strong>
                </p>
                <p className="text-xs text-purple-400 font-semibold mb-3">
                    📅 {event.dateStart?.split('T')[0]}
                </p>
            </Link>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">


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
                    <ShareLinks event={event} />
                </div>
            </div>
        </div>
    )
}

export default GoabaseEventCard
