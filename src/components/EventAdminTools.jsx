import { useState } from 'react'
import { hideEvent, rereadLineUp } from '../api/backend.js'

// Admin tools for one event: read its line-up again now (instead of waiting up to two days for its turn), or hide
// it from the whole site when it doesn't belong (not psytrance, a duplicate)
function EventAdminTools({ id, onHidden }) {
    const [busy, setBusy] = useState(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [reason, setReason] = useState('')

    const run = async (what, action) => {
        setBusy(what)
        setMessage('')
        setError('')
        try {
            await action()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not do that. Try again.')
        } finally {
            setBusy(null)
        }
    }

    const reread = () => run('reread', async () => {
        const { artists } = await rereadLineUp(id)
        setMessage(artists.length ? `Read again: ${artists.length} artists (${artists.slice(0, 6).join(', ')}${artists.length > 6 ? '…' : ''})`
            : 'Read again: no artists in the line-up.')
    })

    const hide = () => {
        if (!window.confirm('Hide this event from the whole site? You can show it again later.')) return
        run('hide', async () => {
            await hideEvent(id, reason.trim() || null)
            onHidden?.()
        })
    }

    return (
        <div className="panel mb-6 grid gap-3">
            <h2 className="panel__label m-0">Tools</h2>
            <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn" disabled={busy !== null} onClick={reread}>
                    {busy === 'reread' ? 'Reading…' : 'Read the line-up again now'}
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input className="field flex-1 min-w-48" aria-label="Why hide it" maxLength={300} value={reason}
                    placeholder="Why (e.g. not psytrance, duplicate of #118537)" onChange={(e) => setReason(e.target.value)} />
                <button type="button" className="btn btn--ghost btn--danger" disabled={busy !== null} onClick={hide}>
                    {busy === 'hide' ? 'Hiding…' : 'Hide from the site'}
                </button>
            </div>
            {message && <p className="mono text-xs soft m-0" role="status">{message}</p>}
            {error && <p className="notice m-0">{error}</p>}
        </div>
    )
}

export default EventAdminTools
