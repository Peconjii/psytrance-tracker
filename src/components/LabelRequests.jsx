import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideLabelRequest, fetchLabelRequests } from '../api/backend.js'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// For admins: what label owners asked to change in their crew. Approving puts the artist on the label (or takes them
// off) for the label's page, its followers and its numbers.
function LabelRequests() {
    const [requests, setRequests] = useState(null)
    const [error, setError] = useState('')
    const [deciding, setDeciding] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchLabelRequests(controller.signal)
            .then(setRequests)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the label requests.') })
        return () => controller.abort()
    }, [])

    const decide = async (request, approve) => {
        setDeciding(request.id)
        setError('')
        try {
            await decideLabelRequest(request.id, approve)
            setRequests(list => list.filter(r => r.id !== request.id))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setDeciding(null)
        }
    }

    if (error && !requests) return <p className="notice">{error}</p>
    if (!requests || requests.length === 0) return null

    return (
        <section className="mt-8">
            <h2 className="panel__label">Label crew · {requests.length} waiting</h2>
            {error && <p className="notice">{error}</p>}
            <ul className="grid gap-3 list-none p-0 m-0">
                {requests.map(request => (
                    <li key={request.id} className="panel grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge">{request.kind === 'ADD' ? 'Add to crew' : 'Take off crew'}</span>
                            <Link className="link font-medium" to={`/labels/${encodeURIComponent(request.label)}`}>{request.label}</Link>
                            <span className="mono text-xs muted ml-auto">@{request.username} · {DATE.format(new Date(request.createdAt))}</span>
                        </div>
                        <p className="m-0"><strong>{request.artistName}</strong></p>
                        <div className="flex flex-wrap gap-2">
                            <button className="btn btn--primary" disabled={deciding !== null} onClick={() => decide(request, true)}>
                                {deciding === request.id ? 'Saving…' : 'Approve'}
                            </button>
                            <button className="btn btn--ghost" disabled={deciding !== null} onClick={() => decide(request, false)}>Reject</button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default LabelRequests
