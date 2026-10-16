import { useState, useEffect } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { fetchEventDetails, fetchAftermovie, fetchGoing } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import EventMap from '../components/EventMap.jsx'
import ReviewSection from '../components/ReviewSection.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import GoingButton from '../components/GoingButton.jsx'
import ShareLinks from '../components/ShareLinks.jsx'
import usePageMeta, { SITE_URL } from '../hooks/usePageMeta.js'

const FALLBACK_IMAGE = 'https://placehold.co/800x400/0f172a/06b6d4?text=Psytrance+Gathering'

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

// The backend sends the time as it is on the clock at the venue ("2026-09-22T22:00:00"), so it is
// shown as is: building the Date from its parts keeps the browser from shifting it to another time zone
function formatWhen(value) {
    if (!value) return null
    const [date, time] = value.split('T')
    const [year, month, day] = date.split('-').map(Number)
    const formatted = DATE_FORMAT.format(new Date(year, month - 1, day))
    return time ? `${formatted} · ${time.slice(0, 5)}` : formatted
}

function Section({ title, children }) {
    return (
        <section className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{title}</h2>
            {children}
        </section>
    )
}

function soundCloudSearchUrl(artist) {
    return `https://soundcloud.com/search/people?q=${encodeURIComponent(artist)}`
}

function TextPlaceholder() {
    return (
        <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-slate-800/60 rounded-lg w-3/4" />
            <div className="h-3 bg-slate-800/60 rounded-lg w-1/2" />
            <div className="h-3 bg-slate-800/40 rounded-lg w-2/3" />
        </div>
    )
}

// schema.org Event, see https://developers.google.com/search/docs/appearance/structured-data/event
function eventStructuredData(event, details, id) {
    const lat = event.parsedLat || event.lat || event.geoLat
    const lon = event.parsedLon || event.lon || event.geoLon
    return {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name: event.nameParty,
        url: `${SITE_URL}/events/${id}`,
        startDate: details?.startsAt || event.dateStart,
        endDate: details?.endsAt || event.dateEnd || undefined,
        eventStatus: /cancel/i.test(event.nameStatus || '')
            ? 'https://schema.org/EventCancelled'
            : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        image: [details?.urlImageLarge || event.urlImageMedium].filter(Boolean),
        description: details?.info?.slice(0, 500) || undefined,
        location: {
            '@type': 'Place',
            name: event.nameTown || event.nameCountry,
            address: {
                '@type': 'PostalAddress',
                addressLocality: event.nameTown || undefined,
                addressCountry: event.nameCountry || undefined,
            },
            geo: lat && lon ? { '@type': 'GeoCoordinates', latitude: Number(lat), longitude: Number(lon) } : undefined,
        },
        organizer: details?.organizer
            ? { '@type': 'Organization', name: details.organizer, url: details.organizerUrl || undefined }
            : undefined,
        performer: details?.lineUp
            ?.filter(line => line.artist)
            .map(line => ({ '@type': 'PerformingGroup', name: line.artist })),
    }
}

function EventDetails() {
    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    // Coming from a card or the map, the event from the list is passed along and shown right
    // away; the details request then fills in the rest. Opened from a shared link, there is none.
    const passedEvent = location.state?.event
    const preview = String(passedEvent?.id) === id ? passedEvent : null

    // Tagged with the id they belong to, so another event's data is never shown while the next one loads
    const [loaded, setLoaded] = useState({ id: null, details: null, error: null })
    const [weather, setWeather] = useState({ id: null, value: null })
    const [aftermovie, setAftermovie] = useState({ id: null, value: null })
    const [going, setGoing] = useState({ id: null, value: null })
    const [attempt, setAttempt] = useState(0)

    const details = loaded.id === id ? loaded.details : null
    const error = loaded.id === id ? loaded.error : null
    const event = details || preview
    const currentWeather = weather.id === id ? weather.value : null
    const currentAftermovie = aftermovie.id === id ? aftermovie.value : null
    const currentGoing = going.id === id ? going.value : null

    const place = event ? [event.nameTown, event.nameCountry].filter(Boolean).join(', ') : ''
    usePageMeta({
        title: event ? `${event.nameParty}${place ? ` – ${place}` : ''}` : 'Psytrance Event',
        description: event
            ? `${event.nameParty}: psytrance ${(event.nameType || 'event').toLowerCase()}${place ? ` in ${place}` : ''}${event.dateStart ? ` on ${formatWhen(event.dateStart)}` : ''}. Line-up, location, entry fee, weather and reviews.`
            : undefined,
        path: `/events/${id}`,
    })

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [id])

    // Doesn't need the details, so it starts right away
    useEffect(() => {
        const controller = new AbortController()
        fetchGoing(id, controller.signal).then(status => {
            if (!controller.signal.aborted) setGoing({ id, value: status })
        })
        return () => controller.abort()
    }, [id])

    useEffect(() => {
        const controller = new AbortController()
        fetchEventDetails(id, controller.signal)
            .then(data => {
                setLoaded({ id, details: data, error: null })
                fetchWeatherForEvents([data], controller.signal)
                    .then(found => setWeather({ id, value: found[weatherKey(data)] || null }))
                // Asked only now, so the backend already has this event's details cached
                fetchAftermovie(id, controller.signal)
                    .then(video => setAftermovie({ id, value: video }))
            })
            .catch(err => {
                if (controller.signal.aborted) return
                const message = err.response?.status === 404
                    ? 'This event does not exist or was removed from Goabase.'
                    : err.response?.data?.message || 'Could not load this event. Is the backend running?'
                setLoaded({ id, details: null, error: message })
            })
        return () => controller.abort()
    }, [id, attempt])

    const retry = () => {
        setLoaded({ id: null, details: null, error: null })
        setAttempt(count => count + 1)
    }

    // Back to wherever the user came from; a shared link opened in a new tab has no history
    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/events'))

    const backButton = (
        <button
            onClick={goBack}
            className="mb-6 text-xs text-slate-400 hover:text-cyan-300 font-semibold uppercase tracking-wider cursor-pointer transition-colors"
        >
            ← Back
        </button>
    )

    if (!event) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {backButton}
                {error ? (
                    <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 backdrop-blur-md">
                        <p className="text-red-400 text-sm mb-4">{error}</p>
                        <button
                            onClick={retry}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800 cursor-pointer"
                        >
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 animate-pulse grid lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-2 h-72 bg-slate-800/60 rounded-2xl" />
                        <div className="lg:col-span-3 space-y-3">
                            <div className="h-8 bg-slate-800/60 rounded-lg w-3/4" />
                            <div className="h-4 bg-slate-800/40 rounded-lg w-1/2" />
                            <div className="h-4 bg-slate-800/40 rounded-lg w-1/3" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    const startsAt = formatWhen(details?.startsAt || event.dateStart)
    const endsAt = formatWhen(details?.endsAt || event.dateEnd)
    const isCancelled = /cancel/i.test(event.nameStatus || '')
    const hasStory = details && (details.lineUp.length > 0 || details.info)

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {/* Lets Google show the event with its date and place in search results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData(event, details, id)).replace(/</g, '\\u003c') }}
            />
            {backButton}

            {/* Header: flyer and the key facts */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-4 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                    <img
                        src={details?.urlImageLarge || event.urlImageMedium || FALLBACK_IMAGE}
                        alt={event.nameParty}
                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE }}
                        className="w-full max-h-[28rem] object-contain"
                    />
                </div>

                <div className="lg:col-span-3 flex flex-col gap-4 min-w-0">
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {event.nameType}
                        </span>
                        {event.nameStatus && (
                            <span className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                                isCancelled
                                    ? 'bg-red-500/15 text-red-300 border-red-500/40'
                                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            }`}>
                                {event.nameStatus}
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-wide text-white break-words">
                        {event.nameParty}
                    </h1>

                    <div className="space-y-1.5 text-sm">
                        <p className="text-slate-300">
                            📍 {event.nameTown}{event.nameCountry && <>, <strong className="text-cyan-400">{event.nameCountry}</strong></>}
                        </p>
                        {startsAt && (
                            <p className="text-purple-300 font-semibold">
                                📅 {startsAt}{endsAt && endsAt !== startsAt && <span className="text-slate-400 font-normal"> → {endsAt}</span>}
                            </p>
                        )}
                        {currentWeather && (
                            <p className="text-cyan-300">🌡️ {Math.round(currentWeather.temperature)}°C at the venue right now</p>
                        )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
                        <FavoriteButton event={event} />
                        <GoingButton eventId={id} status={currentGoing} onChange={status => setGoing({ id, value: status })} />
                        {event.urlPartyHtml && (
                            <a
                                href={event.urlPartyHtml}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-950/50 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all"
                            >
                                View on Goabase ↗
                            </a>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">Share:</span>
                            <ShareLinks event={event} />
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <p className="text-red-400 text-sm text-center mt-6">
                    {error}{' '}
                    <button onClick={retry} className="underline cursor-pointer hover:text-red-300">Try again</button>
                </p>
            )}

            <div className="grid lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 space-y-6 min-w-0">
                    {!details && !error && (
                        <Section title="Line-up">
                            <TextPlaceholder />
                        </Section>
                    )}
                    {currentAftermovie && (
                        <Section title="Aftermovie">
                            <div className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                                {/* youtube-nocookie: YouTube sets no tracking cookies until the video is played */}
                                <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${currentAftermovie.videoId}`}
                                    title={currentAftermovie.title}
                                    loading="lazy"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                        </Section>
                    )}
                    {details?.lineUp.length > 0 && (
                        <Section title="Line-up">
                            {/* Every line as the organizer wrote it; the ones the backend recognised as an artist
                                link to the artist's page (their other events) and get a SoundCloud link */}
                            <ul className="text-sm leading-relaxed">
                                {details.lineUp.map((line, i) => line.text === '' ? (
                                    <li key={i} aria-hidden="true" className="h-3" />
                                ) : (
                                    <li key={i} className="flex items-center justify-between gap-3 py-0.5 min-w-0">
                                        {line.artistSlug ? (
                                            <Link
                                                to={`/artists/${encodeURIComponent(line.artistSlug)}`}
                                                state={{ name: line.artist }}
                                                title={`Where else does ${line.artist} play?`}
                                                className="break-words min-w-0 text-slate-200 hover:text-cyan-300 underline decoration-slate-700 hover:decoration-cyan-400 underline-offset-4 transition-colors"
                                            >
                                                {line.text}
                                            </Link>
                                        ) : (
                                            <span className={`break-words min-w-0 ${line.artist ? 'text-slate-200' : 'text-slate-400'}`}>{line.text}</span>
                                        )}
                                        {line.artist && (
                                            <a
                                                href={soundCloudSearchUrl(line.artist)}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={`Find ${line.artist} on SoundCloud`}
                                                className="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25 hover:bg-orange-500/20 transition-colors"
                                            >
                                                ☁ SoundCloud
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}
                    {details?.info && (
                        <Section title="About">
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line break-words">{details.info}</p>
                        </Section>
                    )}
                    {details && !hasStory && (
                        <Section title="About">
                            <p className="text-slate-500 text-sm">The organizers haven't published a line-up or description yet.</p>
                        </Section>
                    )}

                    <ReviewSection eventId={id} />
                </div>

                <div className="space-y-6 min-w-0">
                    <Section title="Venue">
                        {details?.location && (
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line break-words mb-3">{details.location}</p>
                        )}
                        <EventMap
                            key={id}
                            lat={event.lat}
                            lon={event.lon}
                            partyName={event.nameParty}
                            locationName={[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}
                        />
                    </Section>

                    {details?.entryFee && (
                        <Section title="Entry Fee">
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line break-words">{details.entryFee}</p>
                        </Section>
                    )}

                    {(details?.organizer || details?.organizerUrl) && (
                        <Section title="Organizer">
                            {details.organizer && <p className="text-slate-200 text-sm font-semibold">{details.organizer}</p>}
                            {details.organizerUrl && (
                                <a
                                    href={details.organizerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 text-sm break-all"
                                >
                                    {details.organizerUrl.replace(/^https?:\/\//, '')} ↗
                                </a>
                            )}
                        </Section>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EventDetails
