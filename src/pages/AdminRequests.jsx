import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideArtistRequest, fetchArtistRequests } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import { GenreChip } from '../components/AdminParts'
import LabelRequests from '../components/LabelRequests.jsx'
import ClaimRequests from '../components/ClaimRequests.jsx'
import NewPageRequests from '../components/NewPageRequests.jsx'
import AddToMap from '../components/AddToMap.jsx'
import usePageMeta from '../hooks/usePageMeta.js'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Admin panel: what artists asked to change on their profile and need an admin for: their genres on the map
// (approving moves their satellite for everyone, and is in the history with undo) or the name on their page.
function AdminRequests() {
    usePageMeta({ title: 'Requests', path: '/admin/requests', noindex: true })
    const [requests, setRequests] = useState(null)
    const [error, setError] = useState('')
    const [deciding, setDeciding] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchArtistRequests(controller.signal)
            .then(setRequests)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the requests.') })
        return () => controller.abort()
    }, [])

    const decide = async (request, approve) => {
        setDeciding(request.id)
        setError('')
        try {
            await decideArtistRequest(request.id, approve)
            setRequests(prev => prev.filter(r => r.id !== request.id))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setDeciding(null)
        }
    }

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · requests</div>
                <h1 className="page-title">Artist requests</h1>
                <p className="page-head__sub">
                    Artists edit their own profile, tracks and festivals. Their genres and name wait here for you.
                </p>
            </header>
            <AdminTabs />

            {error && <p className="notice mb-4">{error}</p>}

            {requests === null ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : requests.length === 0 ? (
                <div className="empty"><p><strong>Nothing to decide.</strong></p></div>
            ) : (
                <ul className="rows">
                    {requests.map(request => (
                        <li key={request.id} className="rows__item admin-artist">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="badge">{request.kind === 'GENRES' ? 'Genres' : 'Name'}</span>
                                <Link className="link font-medium" to={`/artists/${encodeURIComponent(request.artistSlug)}`}>{request.artistName}</Link>
                                <span className="mono text-xs muted ml-auto">@{request.username} · {DATE.format(new Date(request.createdAt))}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="muted text-sm">Wants:</span>
                                {request.kind === 'GENRES'
                                    ? request.value.split(',').map(id => <GenreChip key={id} id={id} />)
                                    : <strong>{request.value}</strong>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button className="btn btn--primary" disabled={deciding !== null} onClick={() => decide(request, true)}>
                                    {deciding === request.id ? 'Saving…' : 'Approve'}
                                </button>
                                <button className="btn btn--ghost" disabled={deciding !== null} onClick={() => decide(request, false)}>Reject</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <ClaimRequests />
            <NewPageRequests />
            <AddToMap />
            <LabelRequests />
        </div>
    )
}

export default AdminRequests
