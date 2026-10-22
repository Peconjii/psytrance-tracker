import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    fetchArtistOwnerStats, fetchFestivalOwnerStats, fetchLabelOwnerStats, fetchOrganizerOwnerStats,
} from '../api/backend.js'
import StatView, { StatViewToggle } from './StatView.jsx'
import { useStatsView } from './statsView.js'

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// What each kind of page loads, calls its events and counts as reach
const KINDS = {
    artist: {
        fetch: fetchArtistOwnerStats, events: d => d.gigs, noun: 'gigs', column: 'Gig', reach: 'Followers reached',
        reachHint: 'Your followers who heard of this gig: listed when they followed you, or emailed when it was new',
    },
    organizer: {
        fetch: fetchOrganizerOwnerStats, events: d => d.events, noun: 'events', column: 'Event', reach: 'Line-up followers',
        reachHint: 'People who follow someone in the line-up',
    },
    label: {
        fetch: fetchLabelOwnerStats, events: d => d.gigs, noun: 'crew gigs', column: 'Crew gig', reach: 'Label followers reached',
        reachHint: "The label's followers who heard of this gig",
    },
    festival: {
        fetch: fetchFestivalOwnerStats, events: d => d.editions, noun: 'editions', column: 'Edition', reach: 'Line-up followers',
        reachHint: 'People who follow someone in the line-up',
    },
}

// The numbers only the owner (and admins) see on the edit page: per gig, event or edition who is going, saved it,
// reviewed it and how many people heard of it through following. kind: artist, organizer, label or festival;
// id: the artist's or organizer's slug, the label's name or the festival's id.
function OwnerNumbers({ kind, id }) {
    const [loaded, setLoaded] = useState({ key: null, data: null, error: null })
    const [view, toggleView] = useStatsView()
    const setup = KINDS[kind]
    const key = kind + ':' + id
    const data = loaded.key === key ? loaded.data : null

    useEffect(() => {
        const controller = new AbortController()
        KINDS[kind].fetch(id, controller.signal)
            .then(found => setLoaded({ key, data: found, error: null }))
            .catch(err => { if (!controller.signal.aborted) setLoaded({ key, data: null, error: err.response?.data?.message || 'Could not load the numbers.' }) })
        return () => controller.abort()
    }, [kind, id, key])

    const error = loaded.key === key ? loaded.error : null
    if (error) return <section className="panel mb-4"><p className="notice m-0">{error}</p></section>
    if (!data) return null

    const events = setup.events(data)
    const tiles = [
        ...(data.followers !== undefined ? [{ value: data.followers, label: 'Followers' }] : [{ value: events.length, label: setup.noun }]),
        ...(data.followersWithEmails !== undefined ? [{ value: data.followersWithEmails, label: 'Get our emails' }] : []),
        { value: data.totals.going, label: 'Going, all together' },
        { value: data.totals.saved, label: 'Saved, all together' },
    ]
    const upcoming = events.filter(e => e.upcoming).slice().reverse()

    return (
        <section className="panel mb-4 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="panel__label m-0">Your numbers (only you and admins see these)</h2>
                <StatViewToggle view={view} onToggle={toggleView} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {tiles.map(t => (
                    <div key={t.label} className="stat"><span className="stat__value">{t.value}</span><span className="stat__label">{t.label}</span></div>
                ))}
            </div>
            {upcoming.length > 0 && (
                <div>
                    <h3 className="field-label">Going, next {setup.noun}</h3>
                    <StatView view={view} unit="going" rows={upcoming.map(e => ({ key: String(e.eventId), label: e.name, value: e.going }))} />
                </div>
            )}
            {events.length === 0 ? (
                <p className="muted text-sm m-0">No {setup.noun} in the line-ups we read yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="owner-table">
                        <thead>
                            <tr>
                                <th>{setup.column}</th><th>Going</th><th>Saved</th><th>Reviews</th><th>Rating</th>
                                <th title={setup.reachHint}>{setup.reach}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(e => (
                                <tr key={e.eventId}>
                                    <td>
                                        <Link className="link" to={`/events/${e.eventId}`}>{e.name}</Link>
                                        <span className="block mono text-xs muted">
                                            {e.dateStart ? DAY.format(new Date(e.dateStart + 'T12:00:00')) : 'Date TBA'}
                                            {' · '}{[e.town, e.country].filter(Boolean).join(', ')}{e.upcoming ? ' · coming up' : ''}
                                        </span>
                                    </td>
                                    <td>{e.going}</td><td>{e.saved}</td><td>{e.reviews}</td>
                                    <td>{e.rating ?? '–'}</td><td>{e.reach}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}

export default OwnerNumbers
