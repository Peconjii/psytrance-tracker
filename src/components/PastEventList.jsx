import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPastEvents } from '../api/backend.js'

const PAGE_SIZE = 24
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

// The archive on the events page: events that are over, newest first, by month. Only the search filters it.
function PastEventList({ search }) {
    const [events, setEvents] = useState([])
    const [page, setPage] = useState(0)
    const [state, setState] = useState({ loading: true, hasNext: false, total: 0, error: '' })

    useEffect(() => {
        const controller = new AbortController()
        fetchPastEvents({ page, size: PAGE_SIZE, search }, controller.signal)
            .then(found => {
                setEvents(list => (page === 0 ? found.content : [...list, ...found.content]))
                setState({ loading: false, hasNext: found.hasNext, total: found.totalElements, error: '' })
            })
            .catch(() => { if (!controller.signal.aborted) setState(s => ({ ...s, loading: false, error: 'Could not load the past events.' })) })
        return () => controller.abort()
    }, [page, search])

    if (state.error && events.length === 0) return <p className="notice">{state.error}</p>
    if (state.loading && events.length === 0) return <p className="mono text-xs muted">Loading…</p>
    if (events.length === 0) {
        return (
            <div className="empty">
                <p><strong>{search ? `No past event with “${search}”.` : 'No past events yet.'}</strong></p>
                <p>The site keeps the events it read since October 2026.</p>
            </div>
        )
    }

    // Grouped by the month they started in
    const months = []
    for (const e of events) {
        const label = e.dateStart ? MONTH.format(new Date(e.dateStart + 'T12:00:00')) : 'Date unknown'
        if (months.at(-1)?.label !== label) months.push({ label, events: [] })
        months.at(-1).events.push(e)
    }

    return (
        <div className="grid gap-6">
            <p className="mono text-xs muted m-0">{state.total} past events{search ? ` with “${search}”` : ''}; only the search filters the archive.</p>
            {months.map(m => (
                <section key={m.label}>
                    <h2 className="panel__label">{m.label} · {m.events.length}</h2>
                    <ul className="rows">
                        {m.events.map(e => (
                            <li key={e.id}>
                                <Link to={`/events/${e.id}`} className="rows__item">
                                    <span className="rows__name">
                                        {e.name}
                                        <span className="block mono text-xs muted">
                                            {e.dateStart ? DAY.format(new Date(e.dateStart + 'T12:00:00')) : 'Date unknown'}
                                            {' · '}{[e.town, e.country].filter(Boolean).join(', ')}
                                        </span>
                                    </span>
                                    <span className="rows__meta">{e.artists} artists{e.going ? ` · ${e.going} went` : ''}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {state.hasNext && (
                <div>
                    <button type="button" className="btn" disabled={state.loading}
                        onClick={() => { setState(s => ({ ...s, loading: true })); setPage(p => p + 1) }}>
                        {state.loading ? 'Loading…' : 'Older events'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default PastEventList
