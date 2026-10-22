import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLabelStats } from '../api/backend.js'
import FollowButton from '../components/FollowButton.jsx'
import GigStats from '../components/GigStats.jsx'
import usePageMeta from '../hooks/usePageMeta.js'
import { artistSlug } from '../map/data/events'
import { labels } from '../map/data/types'

const GIG_DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// A label of the map as a page: its crew, where the crew plays next (the label's tour) and its numbers
function Label() {
    const { name } = useParams()
    const label = labels[name]
    usePageMeta({
        title: `${name} – Psytrance Label`,
        description: `${name}: the label's artists, where they play next and how often.`,
        path: `/labels/${encodeURIComponent(name)}`,
    })
    const [loaded, setLoaded] = useState({ name: null, stats: null, error: null })
    const stats = loaded.name === name ? loaded.stats : null
    const error = loaded.name === name ? loaded.error : null

    useEffect(() => {
        if (!label) return
        const controller = new AbortController()
        fetchLabelStats(name, controller.signal)
            .then(found => setLoaded({ name, stats: found, error: null }))
            .catch(() => { if (!controller.signal.aborted) setLoaded({ name, stats: null, error: 'Could not load the numbers.' }) })
        return () => controller.abort()
    }, [name, label])

    if (!label) {
        return (
            <div className="page">
                <div className="empty"><p><strong>No label called {name} on the map.</strong></p>
                    <p><Link className="link" to="/">Back to the galaxy</Link></p></div>
            </div>
        )
    }

    return (
        <div className="page">
            <div className="panel mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="page-head__tag">// Constellation · label</div>
                    <h1 className="page-title">{name}</h1>
                    <p className="mono text-xs muted mt-2 mb-0">
                        {[label.country, label.since && `since ${label.since}`, `${label.artists.length} artists on the map`].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <FollowButton label={name} name={name} />
                    <Link className="btn btn--ghost" to={`/?label=${encodeURIComponent(name)}`}>On the map →</Link>
                </div>
            </div>

            <section className="panel mb-4">
                <h2 className="panel__label">Crew · {label.artists.length}</h2>
                <div className="flex flex-wrap gap-2">
                    {label.artists.map(a => (
                        <Link key={a} className="chip no-underline" to={`/artists/${encodeURIComponent(artistSlug(a))}`}>{a}</Link>
                    ))}
                </div>
            </section>

            {error && <p className="notice">{error}</p>}
            {!stats ? (
                !error && <p className="mono text-xs muted">Loading…</p>
            ) : (
                <>
                    <section className="panel mb-4">
                        <h2 className="panel__label">The crew plays next · {stats.upcoming.length}</h2>
                        {stats.upcoming.length === 0 ? (
                            <p className="muted text-sm m-0">No upcoming gigs of the crew right now.</p>
                        ) : (
                            <ul className="rows">
                                {stats.upcoming.map(gig => (
                                    <li key={gig.eventId}>
                                        <Link to={`/events/${gig.eventId}`} className="rows__item">
                                            <span className="rows__name">
                                                <span className="mono text-xs muted artist-gig__day">
                                                    {gig.dateStart ? GIG_DAY.format(new Date(gig.dateStart + 'T12:00:00')) : 'Date TBA'}
                                                </span>
                                                {gig.name}
                                                <span className="block mono text-xs muted">{gig.artists.join(', ')}</span>
                                            </span>
                                            <span className="rows__meta">{[gig.town, gig.country].filter(Boolean).join(', ')}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    <section className="panel mb-4">
                        <h2 className="panel__label">Numbers</h2>
                        <GigStats stats={stats} extraTiles={[]} />
                        <p className="mono text-xs muted mt-3 mb-0">
                            {stats.crewWithGigs} of {stats.crew} artists of the crew have gigs in the line-ups we read; each event counts once.
                        </p>
                    </section>
                </>
            )}
        </div>
    )
}

export default Label
