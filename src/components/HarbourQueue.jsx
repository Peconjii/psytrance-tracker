import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hideEvent, setAdminEventGenres } from '../api/backend.js'
import { fetchMapEvents } from '../map/data/events'
import { AddGenre } from './AdminParts'
import { WEEKDAY_DAY as DAY } from '../dates.js'
import { data } from '../map/data/types'

// Genres whose name stands as whole words in the event's name ("FOREST GATHERING" -> Forest), longest names first so
// "Dark progressive" wins over "Progressive psy"; a guess to take with one click, nothing is set by itself
// Read each time: genres admins added to the galaxy join after the site loads
const byLength = () => [...data.genres].sort((a, b) => b.name.length - a.name.length)
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function guessGenres(name) {
    let rest = ` ${(name ?? '').toLowerCase()} `
    const found = []
    for (const g of byLength()) {
        const words = new RegExp(`[^a-z0-9]${escape(g.name.toLowerCase())}[^a-z0-9]`)
        if (words.test(rest)) {
            found.push(g)
            rest = rest.replace(words, ' ')
        }
    }
    return found.slice(0, 2)
}


// The harbour as a work list for admins: the next 30 days' events whose genre isn't known, soonest first. Picking a
// genre sets it by hand and the ship flies off the list; "More" opens the event in the editor above, and "Hide" takes
// it off the site (events that aren't psytrance end up in the harbour).
function HarbourQueue({ onOpen, onHidden }) {
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

    const hide = async (event) => {
        const reason = window.prompt(`Hide "${event.nameParty}" from the site? Why:`, 'Not psytrance')
        if (reason === null) return
        setSaving(event.id)
        setError('')
        try {
            await hideEvent(event.id, reason.trim() || null)
            setEvents(list => list.filter(e => e.id !== event.id))
            onHidden?.()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not hide it. Try again.')
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
                            {guessGenres(e.nameParty).map(g => (
                                <button key={g.id} type="button" className="btn" disabled={saving === e.id}
                                    title={`The name says ${g.name}: set it`} onClick={() => setGenre(e, g.id)}>✓ {g.name}</button>
                            ))}
                            <button type="button" className="btn btn--ghost" onClick={() => onOpen(e.id)}>More</button>
                            <button type="button" className="btn btn--ghost btn--danger" disabled={saving === e.id}
                                onClick={() => hide(e)}>Hide</button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default HarbourQueue
