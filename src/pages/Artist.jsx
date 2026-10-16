import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchArtist, fetchGoingForEvents } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import GoabaseEventCard from '../components/GoabaseEventCard.jsx'
import usePageMeta from '../hooks/usePageMeta.js'

function soundCloudSearchUrl(artist) {
    return `https://soundcloud.com/search/people?q=${encodeURIComponent(artist)}`
}

// One artist and the upcoming events they play, soonest first
function Artist() {
    const { slug } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    // The name as the link showed it, so the header doesn't wait for the backend
    const passedName = location.state?.name

    // Tagged with the slug it belongs to, so another artist's events never show while this one loads
    const [loaded, setLoaded] = useState({ slug: null, artist: null, error: null })
    const [weather, setWeather] = useState({})
    const [goingByEvent, setGoingByEvent] = useState({})
    const [attempt, setAttempt] = useState(0)

    const artist = loaded.slug === slug ? loaded.artist : null
    const error = loaded.slug === slug ? loaded.error : null
    const name = artist?.name || passedName || slug

    usePageMeta({
        title: `${name} – Upcoming Psytrance Events`,
        description: `Where does ${name} play next? Upcoming psytrance festivals and parties with ${name} in the line-up.`,
        path: `/artists/${slug}`,
    })

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [slug])

    useEffect(() => {
        const controller = new AbortController()
        fetchArtist(slug, controller.signal)
            .then(data => {
                setLoaded({ slug, artist: data, error: null })
                fetchWeatherForEvents(data.upcomingEvents, controller.signal)
                    .then(found => setWeather(prev => ({ ...prev, ...found })))
                fetchGoingForEvents(data.upcomingEvents, controller.signal)
                    .then(found => setGoingByEvent(prev => ({ ...prev, ...found })))
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setLoaded({
                    slug,
                    artist: null,
                    // Artists only exist once a line-up with them has been read
                    error: err.response?.status === 404
                        ? 'notFound'
                        : err.response?.data?.message || 'Could not load this artist. Is the backend running?'
                })
            })
        return () => controller.abort()
    }, [slug, attempt])

    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/artists'))

    return (
        <div className="max-w-[1700px] mx-auto px-3 sm:px-6 py-8">
            <button
                onClick={goBack}
                className="mb-6 text-xs text-slate-400 hover:text-cyan-300 font-semibold uppercase tracking-wider cursor-pointer transition-colors"
            >
                ← Back
            </button>

            <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(6,182,212,0.15)] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <span className="text-cyan-400 text-xs font-semibold uppercase tracking-widest block mb-1">Artist</span>
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wide text-white break-words">{name}</h1>
                    {artist && (
                        <p className="text-slate-400 text-sm mt-2">
                            {artist.upcomingEvents.length === 0
                                ? 'No upcoming events right now'
                                : `Playing at ${artist.upcomingEvents.length} upcoming ${artist.upcomingEvents.length === 1 ? 'event' : 'events'}`}
                        </p>
                    )}
                </div>
                <a
                    href={soundCloudSearchUrl(name)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25 hover:bg-orange-500/20 transition-colors"
                >
                    ☁ Find on SoundCloud ↗
                </a>
            </div>

            {error === 'notFound' ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-md">
                    <p className="text-slate-300 text-lg font-medium">We haven't seen {name} in other line-ups yet.</p>
                    <p className="text-slate-500 text-xs mt-1">
                        Line-ups are read in the background a few events at a time, so check back later or{' '}
                        <Link to="/artists" className="text-cyan-400 hover:text-cyan-300">browse all artists</Link>.
                    </p>
                </div>
            ) : error ? (
                <div className="text-center py-10">
                    <p className="text-red-400 text-sm mb-3">{error}</p>
                    <button
                        onClick={() => setAttempt(count => count + 1)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            ) : !artist ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl h-72 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {artist.upcomingEvents.map(event => (
                        <GoabaseEventCard
                            key={event.id}
                            event={event}
                            weather={weather[weatherKey(event)]}
                            going={goingByEvent[event.id]}
                            onGoingChange={status => setGoingByEvent(prev => ({ ...prev, [event.id]: status }))}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default Artist
