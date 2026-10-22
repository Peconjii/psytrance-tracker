import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFeaturedEvents, unfeatureEvent } from '../api/backend.js'

// The events admins feature on the map (3 at a time), with "Take off". `version` changes when one was just featured.
function FeaturedEvents({ version }) {
    const [events, setEvents] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        fetchFeaturedEvents(controller.signal)
            .then(setEvents)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the featured events.') })
        return () => controller.abort()
    }, [version])

    const takeOff = async (event) => {
        setError('')
        try {
            await unfeatureEvent(event.eventId)
            setEvents(list => list.filter(e => e.eventId !== event.eventId))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not take it off.')
        }
    }

    if (!events || events.length === 0) return error ? <p className="notice">{error}</p> : null

    return (
        <section className="panel mb-6">
            <h2 className="panel__label">◆ Featured on the map · {events.filter(e => e.upcoming).length} of 3</h2>
            {error && <p className="notice">{error}</p>}
            <ul className="rows">
                {events.map(e => (
                    <li key={e.eventId} className="rows__item flex flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1">
                            <Link className="link font-medium" to={`/events/${e.eventId}`}>{e.name}</Link>
                            <span className="block mono text-xs muted">
                                {e.note || 'no note'} · @{e.featuredBy}{!e.upcoming && ' · over, no longer counts'}
                            </span>
                        </span>
                        <button type="button" className="btn btn--ghost" onClick={() => takeOff(e)}>Take off</button>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default FeaturedEvents
