import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { setAdminEventGenres } from '../api/backend.js'
import { fetchMapEvents } from '../map/data/events'
import { AddGenre } from './AdminParts'

const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// The harbour as a work list for admins: the next 30 days' events whose genre isn't known, soonest first. Picking a
// genre sets it by hand and the ship flies off the list; "More" opens the event in the editor above.
function HarbourQueue({ onOpen }) {
    const [events, setEvents] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(null)

    useEffect(() => {
        let cancelled = false
        fetchMapEvents('MONTH')
            .then(found => { if (!cancelled) setEvents(found.filter(e => e.genres.length === 0)) })
            .catch(() => { if (!cancelled) setError('Could not load the harbour.') })
        return () => { cancelled = true }
    }, [])

    const setGenre = async (event, genreId) => {
        setSaving(event.id)
        setError('')
        try {
            await setAdminEventGenres(event.id, [genreId])
            setEvents(list => list.filter(e => e.id !== event.id))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setSaving(null)
        }
    }

    if (error && !events) return <p className="notice">{error}</p>
    if (!events) return <p className="mono text-xs muted">Loading the harbour…</p>

    return (
        <section className="panel mb-6">
            <h2 className="panel__label">⚓ Harbour · {events.length} ships without a genre (next 30 days)</h2>
            {error && <p className="notice">{error}</p>}
            {events.length === 0 ? (
                <p className="muted text-sm m-0">The harbour is empty: every ship has a genre.</p>
            ) : (
                <ul className="rows">
                    {events.map(e => (
                        <li key={e.id} className="rows__item flex flex-wrap items-center gap-3">
                            <span className="mono text-xs muted w-24 shrink-0">{e.dateStart ? DAY.format(new Date(e.dateStart + 'T12:00:00')) : 'Date TBA'}</span>
                            <span className="min-w-0 flex-1">
                                <Link className="link font-medium" to={`/events/${e.id}`} target="_blank">{e.nameParty}</Link>
                                <span className="block mono text-xs muted">
                                    {[e.nameTown, e.nameCountry].filter(Boolean).join(', ')} · {e.nameType}
                                    {!e.lineUpRead && ' · line-up not read yet'}
                                </span>
                            </span>
                            <AddGenre exclude={[]} disabled={saving === e.id} label={`Genre of ${e.nameParty}`}
                                onAdd={(genreId) => setGenre(e, genreId)} />
                            <button type="button" className="btn btn--ghost" onClick={() => onOpen(e.id)}>More</button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default HarbourQueue
