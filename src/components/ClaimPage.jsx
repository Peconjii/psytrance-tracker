import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { claimPage } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'

const WHAT = { ARTIST: 'artist', ORGANIZER: 'organizer', LABEL: 'label', FESTIVAL: 'festival' }

// "Is this you? Claim this page": the artist, organizer, label or festival asks to own its page. With an email on the
// page's official website it is theirs at once, otherwise an admin checks the link they send.
// kind: ARTIST, ORGANIZER, LABEL or FESTIVAL; target: the slug, the label's name or the festival's id.
function ClaimPage({ kind, target, name, onClaimed }) {
    const { user } = useAuth()
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const [proofUrl, setProofUrl] = useState('')
    const [message, setMessage] = useState('')
    const [state, setState] = useState({ sending: false, done: null, error: '' })

    if (!user) {
        return (
            <p className="mono text-xs muted m-0">
                Is this you? <Link className="link" to="/login" state={{ from: location.pathname }}>Log in</Link> to claim this page.
            </p>
        )
    }
    if (state.done) {
        return state.done === 'APPROVED'
            ? <p className="notice notice--ok m-0">This page is yours now: use “✎ Edit page”.</p>
            : <p className="notice notice--ok m-0">Thanks! An admin checks your link and links the page to your account.</p>
    }
    if (!open) {
        return (
            <button type="button" className="link mono text-xs bg-transparent border-0 p-0 cursor-pointer text-left"
                onClick={() => setOpen(true)}>Is this you? Claim this page →</button>
        )
    }

    const send = async (e) => {
        e.preventDefault()
        setState({ sending: true, done: null, error: '' })
        try {
            const claim = await claimPage(kind, target, proofUrl.trim(), message.trim())
            setState({ sending: false, done: claim.status, error: '' })
            if (claim.status === 'APPROVED') onClaimed?.()
        } catch (err) {
            const data = err.response?.data
            setState({ sending: false, done: null, error: data?.errors ? 'The link must be an https:// address.' : data?.message || 'Could not send. Try again.' })
        }
    }

    return (
        <form className="panel grid gap-3" onSubmit={send}>
            <h2 className="panel__label m-0">Claim {name}</h2>
            <p className="muted text-sm m-0">
                If you are the {WHAT[kind]}, the page can be yours: you edit it and see its numbers. If your confirmed email is on
                the {WHAT[kind]}'s own website, it's yours right away; otherwise an admin checks the link below.
            </p>
            <div>
                <label htmlFor="claim-proof" className="field-label">A link that shows it's you (official Instagram, website…)</label>
                <input id="claim-proof" type="url" className="field" placeholder="https://…" maxLength={500} value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)} />
            </div>
            <div>
                <label htmlFor="claim-message" className="field-label">Anything else for the admin (optional)</label>
                <textarea id="claim-message" className="field" rows={2} maxLength={1000} value={message}
                    onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className="btn btn--primary" disabled={state.sending}>{state.sending ? 'Sending…' : 'Claim the page'}</button>
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
            {state.error && (
                <p className="notice m-0">
                    {state.error}{state.error.includes('Confirm your email') && <> <Link className="link" to="/profile">Your profile</Link></>}
                </p>
            )}
        </form>
    )
}

export default ClaimPage
