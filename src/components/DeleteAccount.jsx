import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteAccount } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'

// "Delete my account" at the bottom of the profile: asks for the password, then everything that is the person's goes
function DeleteAccount() {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [password, setPassword] = useState('')
    const [state, setState] = useState({ deleting: false, error: '' })

    const confirm = async (e) => {
        e.preventDefault()
        setState({ deleting: true, error: '' })
        try {
            await deleteAccount(password)
            // Home first: logged out on the profile, its guard would send to the login page
            navigate('/', { replace: true })
            logout()
        } catch (err) {
            setState({ deleting: false, error: err.response?.data?.message || 'Could not delete the account. Try again.' })
        }
    }

    return (
        <section className="panel" style={{ '--fam': 'var(--danger)' }}>
            <h2 className="panel__label">Delete my account</h2>
            {!open ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="muted text-sm m-0 max-w-xl">
                        Your account and everything that is yours go for good. <Link className="link" to="/privacy">What we keep</Link>
                    </p>
                    <button type="button" className="btn btn--danger" onClick={() => setOpen(true)}>Delete my account…</button>
                </div>
            ) : (
                <form className="grid gap-3" onSubmit={confirm}>
                    <p className="soft text-sm m-0 max-w-xl">
                        Gone for good: your follows, saved events, “I'm going”, reviews, the events you added, your requests and
                        the pages you own (they stay, without an owner). Messages you sent through the feedback form stay,
                        without your account. This can't be undone.
                    </p>
                    <div>
                        <label htmlFor="delete-password" className="field-label">Your password, to be sure it's you</label>
                        <input id="delete-password" type="password" className="field max-w-sm" autoComplete="current-password"
                            required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" className="btn btn--danger" disabled={state.deleting || !password}>
                            {state.deleting ? 'Deleting…' : 'Delete my account for good'}
                        </button>
                        <button type="button" className="btn btn--ghost" onClick={() => { setOpen(false); setPassword('') }}>Keep it</button>
                    </div>
                    {state.error && <p className="notice m-0">{state.error}</p>}
                </form>
            )}
        </section>
    )
}

export default DeleteAccount
