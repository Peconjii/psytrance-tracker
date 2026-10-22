import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchOrganizer } from '../api/backend.js'
import usePageMeta from '../hooks/usePageMeta.js'

const GIG_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const PAST_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const day = (iso, format) => (iso ? format.format(new Date(iso + 'T12:00:00')) : 'Date TBA')

// An organizer's page: the events they run next and the ones they ran before
function Organizer() {
    const { slug } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const [loaded, setLoaded] = useState({ slug: null, organizer: null, error: null })
    const organizer = loaded.slug === slug ? loaded.organizer : null
    const error = loaded.slug === slug ? loaded.error : null
    const name = organizer?.name || location.state?.name || slug

    usePageMeta({
        title: `${name} – Psytrance Organizer`,
        description: `Festivals and parties run by ${name}, next and before.`,
        path: `/organizers/${slug}`,
    })

    useEffect(() => {
        const controller = new AbortController()
        fetchOrganizer(slug, controller.signal)
            .then(found => setLoaded({ slug, organizer: found, error: null }))
            .catch(err => {
                if (controller.signal.aborted) return
                setLoaded({ slug, organizer: null, error: err.response?.status === 404 ? 'notFound' : 'Could not load this organizer.' })
            })
        return () => controller.abort()
    }, [slug])

    const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/organizers'))

    return (
        <div className="page">
            <button onClick={goBack} className="back-link">← Back</button>
            <div className="panel mb-4">
                <div className="page-head__tag">// Captain · organizer</div>
                <h1 className="page-title">{name}</h1>
                {organizer?.url && (
                    <a className="link mono text-xs" href={organizer.url} target="_blank" rel="noopener noreferrer">
                        {organizer.url.replace(/^https?:\/\//, '')} ↗
                    </a>
                )}
            </div>

            {error === 'notFound' ? (
                <div className="empty">
                    <p><strong>We don't know {name} as an organizer yet.</strong></p>
                    <p>Organizers are read with the line-ups in the background. <Link className="link" to="/organizers">All organizers</Link></p>
                </div>
            ) : error ? (
                <p className="notice">{error}</p>
            ) : !organizer ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : (
                <>
                    <section className="panel mb-4">
                        <h2 className="panel__label">Next events · {organizer.upcomingEvents.length}</h2>
                        {organizer.upcomingEvents.length === 0 ? (
                            <p className="muted text-sm m-0">No upcoming events right now.</p>
                        ) : (
                            <ul className="rows">
                                {organizer.upcomingEvents.map(event => (
                                    <li key={event.id}>
                                        <Link to={`/events/${event.id}`} state={{ event }} className="rows__item">
                                            <span className="rows__name">
                                                <span className="mono text-xs muted artist-gig__day">{day(event.dateStart, GIG_DAY)}</span>
                                                {event.nameParty}
                                            </span>
                                            <span className="rows__meta">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    {organizer.pastEvents.length > 0 && (
                        <section className="panel mb-4">
                            <h2 className="panel__label">Ran before · {organizer.pastEvents.length}</h2>
                            <ul className="rows">
                                {organizer.pastEvents.map(gig => (
                                    <li key={gig.eventId} className="rows__item">
                                        <span className="rows__name">{gig.name}</span>
                                        <span className="rows__meta">{[day(gig.dateStart, PAST_DAY), gig.town, gig.country].filter(Boolean).join(' · ')}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            )}
        </div>
    )
}

export default Organizer
