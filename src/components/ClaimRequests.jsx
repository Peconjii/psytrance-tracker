import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decidePageClaim, fetchPageClaims } from '../api/backend.js'
import { TrustCheckbox } from './TrustPanel.jsx'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const KIND = { ARTIST: 'Artist', ORGANIZER: 'Organizer', LABEL: 'Label', FESTIVAL: 'Festival' }
const PAGE = {
    ARTIST: (t) => `/artists/${encodeURIComponent(t)}`,
    ORGANIZER: (t) => `/organizers/${encodeURIComponent(t)}`,
    LABEL: (t) => `/labels/${encodeURIComponent(t)}`,
    FESTIVAL: (t) => `/festivals/${encodeURIComponent(t)}`,
}

// For admins: who claims which page, with the link they sent. Approving makes them its owner (and is in the history).
function ClaimRequests() {
    const [claims, setClaims] = useState(null)
    const [reasons, setReasons] = useState({})
    const [error, setError] = useState('')
    const [deciding, setDeciding] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchPageClaims(controller.signal)
            .then(setClaims)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the claims.') })
        return () => controller.abort()
    }, [])

    // Claims whose new owner is trusted with the approval
    const [trusted, setTrusted] = useState({})

    const decide = async (claim, approve) => {
        setDeciding(claim.id)
        setError('')
        try {
            await decidePageClaim(claim.id, approve, reasons[claim.id]?.trim() || null, approve && Boolean(trusted[claim.id]))
            setClaims(list => list.filter(c => c.id !== claim.id))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setDeciding(null)
        }
    }

    if (error && !claims) return <p className="notice">{error}</p>
    if (!claims || claims.length === 0) return null

    return (
        <section className="mt-8">
            <h2 className="panel__label">Page claims · {claims.length} waiting</h2>
            {error && <p className="notice">{error}</p>}
            <ul className="grid gap-3 list-none p-0 m-0">
                {claims.map(claim => (
                    <li key={claim.id} className="panel grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge">{KIND[claim.kind]}</span>
                            <Link className="link font-medium" to={PAGE[claim.kind](claim.target)}>{claim.target}</Link>
                            <span className="mono text-xs muted ml-auto">@{claim.username} · {claim.email} · {DATE.format(new Date(claim.createdAt))}</span>
                        </div>
                        {claim.proofUrl && (
                            <a className="link mono text-xs" href={claim.proofUrl} target="_blank" rel="noopener noreferrer">{claim.proofUrl} ↗</a>
                        )}
                        {claim.message && <p className="soft text-sm whitespace-pre-line m-0">{claim.message}</p>}
                        <TrustCheckbox kind={claim.kind} id={`claim-trust-${claim.id}`} checked={Boolean(trusted[claim.id])}
                            onChange={(on) => setTrusted(t => ({ ...t, [claim.id]: on }))} />
                        <div className="flex flex-wrap items-center gap-2">
                            <button className="btn btn--primary" disabled={deciding !== null} onClick={() => decide(claim, true)}>
                                {deciding === claim.id ? 'Saving…' : 'Approve'}
                            </button>
                            <input className="field flex-1 min-w-48" aria-label="Reason" maxLength={500} placeholder="Reason if not (shown to them)"
                                value={reasons[claim.id] ?? ''} onChange={(e) => setReasons(r => ({ ...r, [claim.id]: e.target.value }))} />
                            <button className="btn btn--ghost" disabled={deciding !== null} onClick={() => decide(claim, false)}>Reject</button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default ClaimRequests
