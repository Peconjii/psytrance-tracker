import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchArtist, fetchGenresForEvents, fetchGoingForEvents } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import EventTicket from '../components/EventTicket.jsx'
import EventDays from '../components/EventDays.jsx'
import { TicketSkeletons } from '../components/EventFeed.jsx'
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
    const [genresByEvent, setGenresByEvent] = useState({})
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
                fetchGenresForEvents(data.upcomingEvents, controller.signal)
                    .then(found => setGenresByEvent(prev => ({ ...prev, ...found })))
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
        <div className="page page--wide">
            <button onClick={goBack} className="back-link">← Back</button>

            <div className="panel mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="page-head__tag">// Satellite · artist</div>
                    <h1 className="page-title">{name}</h1>
                    {artist && (
                        <p className="page-head__sub">
                            {artist.upcomingEvents.length === 0
                                ? 'No upcoming events right now'
                                : `Playing at ${artist.upcomingEvents.length} upcoming ${artist.upcomingEvents.length === 1 ? 'event' : 'events'}`}
                        </p>
                    )}
                </div>
                <a href={soundCloudSearchUrl(name)} target="_blank" rel="noreferrer" className="btn shrink-0 self-start sm:self-center">
                    SoundCloud ↗
                </a>
            </div>

            {error === 'notFound' ? (
                <div className="empty">
                    <p><strong>We haven't seen {name} in other line-ups yet.</strong></p>
                    <p>
                        Line-ups are read in the background a few events at a time, so check back later or{' '}
                        <Link to="/artists" className="link">browse all artists</Link>.
                    </p>
                </div>
            ) : error ? (
                <div className="py-8 grid justify-items-center gap-3">
                    <p className="notice m-0">{error}</p>
                    <button onClick={() => setAttempt(count => count + 1)} className="btn">Try again</button>
                </div>
            ) : !artist ? (
                <TicketSkeletons count={4} />
            ) : artist.upcomingEvents.length > 0 && (
                <EventDays
                    events={artist.upcomingEvents}
                    renderTicket={event => (
                        <EventTicket
                            key={event.id}
                            event={event}
                            weather={weather[weatherKey(event)]}
                            going={goingByEvent[event.id]}
                            genres={genresByEvent[event.id]}
                            onGoingChange={status => setGoingByEvent(prev => ({ ...prev, [event.id]: status }))}
                        />
                    )}
                />
            )}
        </div>
    )
}

export default Artist
