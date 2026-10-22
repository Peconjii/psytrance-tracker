import { useState } from 'react'

// For admins on an edit page: the account that owns the page. An empty name unlinks it.
// save(username) and remove() talk to the backend; onSaved() reloads the page.
function OwnerForm({ owner, what, save, remove, onSaved }) {
    const [value, setValue] = useState(owner || '')
    const [status, setStatus] = useState({ saving: false, ok: '', error: '' })

    const submit = async (e) => {
        e.preventDefault()
        setStatus({ saving: true, ok: '', error: '' })
        try {
            if (value.trim()) await save(value.trim())
            else await remove()
            setStatus({ saving: false, ok: 'Saved.', error: '' })
            onSaved?.()
        } catch (err) {
            setStatus({ saving: false, ok: '', error: err.response?.data?.message || 'Could not save. Try again.' })
        }
    }

    return (
        <form className="panel mb-4 grid gap-3" onSubmit={submit}>
            <h2 className="panel__label m-0">Owner account (admins only)</h2>
            <p className="muted text-sm m-0">The account of someone from the {what}, who can then edit this page. Link it once you know it is really them.</p>
            <input className="field" aria-label="Owner username" placeholder="Username (empty: nobody)" value={value}
                onChange={(e) => setValue(e.target.value)} />
            <p className="mono text-xs muted m-0">Now: {owner ? `@${owner}` : 'nobody'}</p>
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn--primary" disabled={status.saving}>{status.saving ? 'Saving…' : 'Save'}</button>
                {status.ok && <span className="mono text-xs soft" role="status">{status.ok}</span>}
                {status.error && <p className="notice m-0">{status.error}</p>}
            </div>
        </form>
    )
}

export default OwnerForm
