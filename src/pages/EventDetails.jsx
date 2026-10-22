import { useState, useEffect } from 'react'
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { fetchEventDetails, fetchAftermovie, fetchGoing, fetchTimetable } from '../api/backend.js'
import { fetchWeatherForEvents, weatherKey } from '../api/weather.js'
import EventMap from '../components/EventMap.jsx'
import ReviewSection from '../components/ReviewSection.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import GoingButton from '../components/GoingButton.jsx'
import ShareLinks from '../components/ShareLinks.jsx'
import usePageMeta, { SITE_URL } from '../hooks/usePageMeta.js'
import { artistSlug } from '../map/data/events'

const FALLBACK_IMAGE = 'https://placehold.co/800x400/05040d/8f88c4?text=No+flyer'

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
        <section className="panel">
            <h2 className="panel__label">{title}</h2>
            {children}
        </section>
    )
}

const SET_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
// "Sat 22:00" from a venue-clock time ("2026-10-24T22:00:00"), read as written so it stays the venue's time
const setTime = (value) => {
    const [date, time] = value.split('T')
    const [year, month, day] = date.split('-').map(Number)
    return `${SET_DAY.format(new Date(year, month - 1, day))} ${time.slice(0, 5)}`
}

// The timetable, one list per stage, in the order the organizer (or an admin) wrote it
function Timetable({ timetable }) {
    const stages = []
    for (const set of timetable.sets) {
        const name = set.stage || ''
        let stage = stages.find(s => s.name === name)
        if (!stage) stages.push(stage = { name, sets: [] })
        stage.sets.push(set)
    }
    return (
        <div className="grid gap-4">
            {stages.map(stage => (
                <div key={stage.name}>
                    {stage.name && <div className="field-label">{stage.name}</div>}
                    <ul className="list-none p-0 m-0 text-sm">
                        {stage.sets.map((set, i) => (
                            <li key={i} className="flex gap-4 py-1 border-b border-dashed border-[var(--line)]">
                                <span className="mono muted shrink-0 w-36">
                                    {setTime(set.startsAt)}{set.endsAt && ` – ${set.endsAt.split('T')[1].slice(0, 5)}`}
                                </span>
                                <Link to={`/artists/${encodeURIComponent(set.artistSlug)}`} state={{ name: set.artist }}
                                    className="text-[var(--fg)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--accent)]">
                                    {set.artist}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            <p className="muted text-xs m-0">
                Times at the venue. {timetable.manual ? 'Checked by the Map of Psy crew.' : 'Read from the line-up; it can change.'}
            </p>
        </div>
    )
}

function soundCloudSearchUrl(artist) {
    return `https://soundcloud.com/search/people?q=${encodeURIComponent(artist)}`
}

function TextPlaceholder() {
    return (
        <div className="grid gap-2" aria-busy="true">
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-2/3" />
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
    const [timetable, setTimetable] = useState({ id: null, value: null })
    const [attempt, setAttempt] = useState(0)

    const details = loaded.id === id ? loaded.details : null
    const error = loaded.id === id ? loaded.error : null
    const event = details || preview
    const currentWeather = weather.id === id ? weather.value : null
    const currentAftermovie = aftermovie.id === id ? aftermovie.value : null
    const currentGoing = going.id === id ? going.value : null
    const currentTimetable = timetable.id === id ? timetable.value : null

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
        // Most events have no set times; then the section stays away
        fetchTimetable(id, controller.signal)
            .then(found => { if (!controller.signal.aborted) setTimetable({ id, value: found }) })
            .catch(() => {})
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
        <button onClick={goBack} className="back-link">← Back</button>
    )

    if (!event) {
        return (
            <div className="page">
                {backButton}
                {error ? (
                    <div className="empty grid justify-items-center gap-3">
                        <p className="notice m-0">{error}</p>
                        <button onClick={retry} className="btn">Try again</button>
                    </div>
                ) : (
                    <div className="panel grid lg:grid-cols-5 gap-6" aria-busy="true">
                        <div className="lg:col-span-2 h-72 skeleton" />
                        <div className="lg:col-span-3 grid gap-3 content-start">
                            <div className="skeleton h-8 w-3/4" />
                            <div className="skeleton h-4 w-1/2" />
                            <div className="skeleton h-4 w-1/3" />
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
        <div className="page">
            {/* Lets Google show the event with its date and place in search results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData(event, details, id)).replace(/</g, '\\u003c') }}
            />
            {backButton}

            {/* Header: flyer and the key facts */}
            <div className="panel grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 map-frame flex items-center justify-center">
                    <img
                        src={details?.urlImageLarge || event.urlImageMedium || FALLBACK_IMAGE}
                        alt={event.nameParty}
                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMAGE }}
                        className="w-full max-h-[28rem] object-contain"
                    />
                </div>

                <div className="lg:col-span-3 flex flex-col gap-4 min-w-0">
                    <div className="page-head__tag">// Ship · Event</div>
                    <div className="flex flex-wrap gap-2">
                        {event.nameType && <span className="badge">{event.nameType}</span>}
                        {event.nameStatus && (
                            <span className={`badge${isCancelled ? ' badge--danger' : ''}`}>{event.nameStatus}</span>
                        )}
                    </div>

                    <h1 className="page-title m-0">{event.nameParty}</h1>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 m-0 text-sm">
                        <dt className="field-label m-0 pt-0.5">Where</dt>
                        <dd className="m-0 soft">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</dd>
                        {startsAt && (
                            <>
                                <dt className="field-label m-0 pt-0.5">When</dt>
                                <dd className="m-0 soft">
                                    {startsAt}{endsAt && endsAt !== startsAt && <span className="muted"> → {endsAt}</span>}
                                </dd>
                            </>
                        )}
                        {currentWeather && (
                            <>
                                <dt className="field-label m-0 pt-0.5">Weather</dt>
                                <dd className="m-0 soft">{Math.round(currentWeather.temperature)}°C at the venue right now</dd>
                            </>
                        )}
                    </dl>

                    <div className="mt-auto pt-4 border-t border-dashed border-[var(--line)] flex flex-wrap items-center gap-3">
                        <FavoriteButton event={event} />
                        <GoingButton eventId={id} status={currentGoing} onChange={status => setGoing({ id, value: status })} />
                        {event.urlPartyHtml && (
                            <a href={event.urlPartyHtml} target="_blank" rel="noreferrer" className="btn">
                                Goabase ↗
                            </a>
                        )}
                        <Link className="btn btn--ghost" title="Wrong date, place or line-up? Tell us"
                            to={`/feedback?${new URLSearchParams({ kind: 'CORRECTION', about: 'EVENT', ref: `${event.nameParty} (#${id})`, from: `/events/${id}` })}`}>
                            ✎ Report a problem
                        </Link>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="field-label m-0">Share</span>
                            <ShareLinks event={event} />
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <p className="notice mt-6">
                    {error}{' '}
                    <button onClick={retry} className="link bg-transparent border-0 p-0 cursor-pointer">Try again</button>
                </p>
            )}

            <div className="grid lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 grid gap-6 content-start min-w-0">
                    {!details && !error && (
                        <Section title="Line-up">
                            <TextPlaceholder />
                        </Section>
                    )}
                    {currentAftermovie && (
                        <Section title="Aftermovie">
                            <div className="aspect-video map-frame overflow-hidden">
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
                    {currentTimetable?.sets.length > 0 && (
                        <Section title="Timetable">
                            <Timetable timetable={currentTimetable} />
                        </Section>
                    )}
                    {details?.lineUp.length > 0 && (
                        <Section title="Line-up · crew">
                            {/* Every line as the organizer wrote it; the ones the backend recognised as an artist
                                link to the artist's page (their other events) and get a SoundCloud link */}
                            <ul className="text-sm leading-relaxed list-none p-0 m-0">
                                {details.lineUp.map((line, i) => line.text === '' ? (
                                    <li key={i} aria-hidden="true" className="h-3" />
                                ) : (
                                    <li key={i} className="flex items-center justify-between gap-3 py-0.5 min-w-0">
                                        {line.artistSlug ? (
                                            <Link
                                                to={`/artists/${encodeURIComponent(line.artistSlug)}`}
                                                state={{ name: line.artist }}
                                                title={`Where else does ${line.artist} play?`}
                                                className="break-words min-w-0 text-[var(--fg)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
                                            >
                                                {line.text}
                                            </Link>
                                        ) : (
                                            <span className={`break-words min-w-0 ${line.artist ? 'text-[var(--fg)]' : 'muted'}`}>{line.text}</span>
                                        )}
                                        {line.artist && (
                                            <a
                                                href={soundCloudSearchUrl(line.artist)}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={`Find ${line.artist} on SoundCloud`}
                                                className="shrink-0 mono text-[11px] text-[var(--goa)] no-underline hover:underline"
                                            >
                                                SoundCloud ↗
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}
                    {details?.info && (
                        <Section title="About">
                            <p className="soft text-sm leading-relaxed whitespace-pre-line break-words m-0">{details.info}</p>
                        </Section>
                    )}
                    {details && !hasStory && (
                        <Section title="About">
                            <p className="muted text-sm m-0">The organizers haven't published a line-up or description yet.</p>
                        </Section>
                    )}

                    <ReviewSection eventId={id} />
                </div>

                <div className="grid gap-6 content-start min-w-0">
                    <Section title="Venue">
                        {details?.location && (
                            <p className="soft text-sm leading-relaxed whitespace-pre-line break-words mt-0 mb-3">{details.location}</p>
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
                        <Section title="Entry fee">
                            <p className="soft text-sm leading-relaxed whitespace-pre-line break-words m-0">{details.entryFee}</p>
                        </Section>
                    )}

                    {(details?.organizer || details?.organizerUrl) && (
                        <Section title="Organizer · captain">
                            {details.organizer && (
                                <p className="text-sm font-medium mt-0 mb-1">
                                    <Link className="link" to={`/organizers/${encodeURIComponent(artistSlug(details.organizer))}`}
                                        state={{ name: details.organizer }}>
                                        {details.organizer} →
                                    </Link>
                                </p>
                            )}
                            {details.organizerUrl && (
                                <a href={details.organizerUrl} target="_blank" rel="noreferrer" className="link text-sm break-all">
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
