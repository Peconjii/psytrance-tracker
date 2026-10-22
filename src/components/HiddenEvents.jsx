import { useEffect, useState } from 'react'
import { fetchHiddenEvents, showEvent } from '../api/backend.js'

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// The events admins hid from the site, with "Show again". `version` changes when one was just hidden, to reload.
function HiddenEvents({ version }) {
    const [events, setEvents] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        fetchHiddenEvents(controller.signal)
            .then(setEvents)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the hidden events.') })
        return () => controller.abort()
    }, [version])

    const show = async (event) => {
        setError('')
        try {
            await showEvent(event.eventId)
            setEvents(list => list.filter(e => e.eventId !== event.eventId))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not show it again.')
        }
    }

    if (!events || events.length === 0) return error ? <p className="notice">{error}</p> : null

    return (
        <section className="panel mb-6">
            <h2 className="panel__label">Hidden from the site · {events.length}</h2>
            {error && <p className="notice">{error}</p>}
            <ul className="rows">
                {events.map(e => (
                    <li key={e.eventId} className="rows__item flex flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1">
                            <span className="font-medium">{e.name}</span>
                            <span className="block mono text-xs muted">
                                #{e.eventId} · {e.reason || 'no reason'} · @{e.hiddenBy}, {WHEN.format(new Date(e.hiddenAt))}
                            </span>
                        </span>
                        <button type="button" className="btn btn--ghost" onClick={() => show(e)}>Show again</button>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default HiddenEvents
