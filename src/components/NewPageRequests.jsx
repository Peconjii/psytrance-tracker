import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideNewPageRequest, fetchNewPageRequests } from '../api/backend.js'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const KIND = { ARTIST: 'Artist', ORGANIZER: 'Organizer', LABEL: 'Label', FESTIVAL: 'Festival' }
const MADE = { ARTIST: (slug) => `/artists/${encodeURIComponent(slug)}`, ORGANIZER: (slug) => `/organizers/${encodeURIComponent(slug)}` }

// For admins: "Not on the map yet?" requests. Approving an artist or organizer makes the page with its owner;
// a label or festival is only noted: it goes into labels.json / festivals.json with the next map update.
function NewPageRequests() {
    const [requests, setRequests] = useState(null)
    const [reasons, setReasons] = useState({})
    const [error, setError] = useState('')
    const [deciding, setDeciding] = useState(null)
    const [made, setMade] = useState([])

    useEffect(() => {
        const controller = new AbortController()
        fetchNewPageRequests(controller.signal)
            .then(setRequests)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the new page requests.') })
        return () => controller.abort()
    }, [])

    const decide = async (request, approve) => {
        setDeciding(request.id)
        setError('')
        try {
            const decided = await decideNewPageRequest(request.id, approve, reasons[request.id]?.trim() || null)
            setRequests(list => list.filter(r => r.id !== request.id))
            if (approve) setMade(list => [decided, ...list])
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setDeciding(null)
        }
    }

    if (error && !requests) return <p className="notice">{error}</p>
    if (!requests || (requests.length === 0 && made.length === 0)) return null

    return (
        <section className="mt-8">
            <h2 className="panel__label">New pages · {requests.length} waiting</h2>
            {error && <p className="notice">{error}</p>}
            {made.map(r => (
                <p key={r.id} className="notice notice--ok">
                    {r.createdSlug
                        ? <>Made <Link className="link" to={MADE[r.kind](r.createdSlug)}>{r.name}</Link> for @{r.username}.</>
                        : <>Noted: add {KIND[r.kind].toLowerCase()} {r.name} to the map's data with the next update.</>}
                </p>
            ))}
            <ul className="grid gap-3 list-none p-0 m-0">
                {requests.map(r => (
                    <li key={r.id} className="panel grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge">{KIND[r.kind]}</span>
                            <strong>{r.name}</strong>
                            {r.country && <span className="mono text-xs muted">{r.country}</span>}
                            <span className="mono text-xs muted ml-auto">@{r.username} · {r.email} · {DATE.format(new Date(r.createdAt))}</span>
                        </div>
                        {[r.websiteUrl, r.proofUrl].filter(Boolean).map(link => (
                            <a key={link} className="link mono text-xs" href={link} target="_blank" rel="noopener noreferrer">{link} ↗</a>
                        ))}
                        {r.genres && <p className="mono text-xs soft m-0">Genres they play: {r.genres}</p>}
                        {r.message && <p className="soft text-sm whitespace-pre-line m-0">{r.message}</p>}
                        <div className="flex flex-wrap items-center gap-2">
                            <button className="btn btn--primary" disabled={deciding !== null} onClick={() => decide(r, true)}>
                                {deciding === r.id ? 'Saving…' : r.kind === 'ARTIST' || r.kind === 'ORGANIZER' ? 'Approve and make the page' : 'Approve (add to the map later)'}
                            </button>
                            <input className="field flex-1 min-w-48" aria-label="Reason" maxLength={500} placeholder="Reason if not (shown to them)"
                                value={reasons[r.id] ?? ''} onChange={(e) => setReasons(x => ({ ...x, [r.id]: e.target.value }))} />
                            <button className="btn btn--ghost" disabled={deciding !== null} onClick={() => decide(r, false)}>Reject</button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default NewPageRequests
