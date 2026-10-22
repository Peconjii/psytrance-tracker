import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approveOurEvent, fetchOurEventsForAdmin, rejectOurEvent } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import { GenreChip } from '../components/AdminParts'
import usePageMeta from '../hooks/usePageMeta.js'

const STATUSES = [
    { value: 'PENDING', label: 'Waiting' },
    { value: 'APPROVED', label: 'On the map' },
    { value: 'REJECTED', label: 'Rejected' },
]
const WHEN = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const when = (iso) => (iso ? WHEN.format(new Date(iso)) : '')

// Admin panel: events added on our site. Approving puts them on the map like a Goabase event (their genres are set as
// picked); rejecting a waiting one tells the sender why, and rejecting an approved one takes it down.
function AdminOurEvents() {
    usePageMeta({ title: 'Added events', path: '/admin/our-events', noindex: true })
    const [status, setStatus] = useState('PENDING')
    const [loaded, setLoaded] = useState({ status: null, events: [] })
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(null)
    const [reasons, setReasons] = useState({})
    const events = loaded.status === status ? loaded.events : null

    useEffect(() => {
        const controller = new AbortController()
        fetchOurEventsForAdmin(status, controller.signal)
            .then(found => setLoaded({ status, events: found }))
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the events.') })
        return () => controller.abort()
    }, [status])

    const decide = async (event, approve) => {
        setBusy(event.id)
        setError('')
        try {
            if (approve) await approveOurEvent(event.id)
            else await rejectOurEvent(event.id, reasons[event.id]?.trim() || null)
            setLoaded(l => ({ ...l, events: l.events.filter(e => e.id !== event.id) }))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="page">
            <AdminTabs />
            <header className="page-head">
                <div className="page-head__tag">// Admin · launch requests</div>
                <h1 className="page-title">Added events</h1>
                <p className="page-head__sub">Events added on our site. Check that they are real and not already on Goabase.</p>
            </header>
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Status">
                {STATUSES.map(s => (
                    <button key={s.value} type="button" className={`chip${status === s.value ? ' is-on' : ''}`}
                        aria-pressed={status === s.value} onClick={() => setStatus(s.value)}>{s.label}</button>
                ))}
            </div>
            {error && <p className="notice">{error}</p>}
            {!events ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : events.length === 0 ? (
                <div className="empty"><p><strong>Nothing here.</strong></p></div>
            ) : (
                <ul className="grid gap-4 list-none p-0 m-0">
                    {events.map(event => (
                        <li key={event.id} className="panel grid gap-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-lg font-medium m-0">
                                    {event.eventId ? <Link className="link" to={`/events/${event.eventId}`}>{event.name}</Link> : event.name}
                                </h2>
                                <span className="mono text-xs muted">by @{event.submittedBy} · {when(event.createdAt)}</span>
                            </div>
                            <p className="soft text-sm m-0">
                                {event.eventType} · {when(event.startsAt)}{event.endsAt && ` → ${when(event.endsAt)}`} ({event.timeZone})
                                <br />{event.town}, {event.country}
                                {event.organizerName && <> · organizer <strong>{event.organizerName}</strong></>}
                            </p>
                            {event.genres.length > 0 && (
                                <div className="flex flex-wrap gap-2">{event.genres.map(id => <GenreChip key={id} id={id} />)}</div>
                            )}
                            {event.lineUp && <pre className="mono text-xs soft whitespace-pre-wrap m-0 max-h-48 overflow-auto">{event.lineUp}</pre>}
                            {event.info && <p className="muted text-sm whitespace-pre-line m-0">{event.info}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mono text-xs">
                                {[event.ticketUrl, event.organizerUrl, event.imageUrl].filter(Boolean).map(link => (
                                    <a key={link} className="link" href={link} target="_blank" rel="noopener noreferrer">
                                        {link.replace(/^https:\/\//, '')} ↗
                                    </a>
                                ))}
                            </div>
                            {event.possibleDuplicates?.length > 0 && (
                                <div className="notice m-0">
                                    Maybe already on Goabase:{' '}
                                    {event.possibleDuplicates.map((d, i) => (
                                        <span key={d.id}>
                                            {i > 0 && ', '}
                                            <Link className="link" to={`/events/${d.id}`}>{d.name}</Link>
                                            <span className="muted"> ({d.dateStart ? DAY.format(new Date(d.dateStart + 'T12:00:00')) : '?'}, {d.town})</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {event.rejectReason && <p className="mono text-xs muted m-0">Reason: {event.rejectReason}</p>}
                            {status !== 'REJECTED' && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {status === 'PENDING' && (
                                        <button type="button" className="btn btn--primary" disabled={busy === event.id}
                                            onClick={() => decide(event, true)}>Approve</button>
                                    )}
                                    <input className="field flex-1 min-w-48" aria-label="Reason" maxLength={500}
                                        placeholder="Reason (shown to the sender)" value={reasons[event.id] ?? ''}
                                        onChange={(e) => setReasons(r => ({ ...r, [event.id]: e.target.value }))} />
                                    <button type="button" className="btn btn--ghost btn--danger" disabled={busy === event.id}
                                        onClick={() => decide(event, false)}>{status === 'APPROVED' ? 'Take down' : 'Reject'}</button>
                                </div>
                            )}
                            {status === 'REJECTED' && (
                                <div>
                                    <button type="button" className="btn" disabled={busy === event.id}
                                        onClick={() => decide(event, true)}>Approve after all</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default AdminOurEvents
