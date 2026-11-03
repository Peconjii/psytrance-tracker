import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/backend'

// The OAuth client id from Google Cloud Console comes from the backend (GOOGLE_CLIENT_ID on Render); while it is
// empty, or the backend can't be reached, there is no Google button
let clientIdRequest
function loadClientId() {
    clientIdRequest ??= api.get('/api/auth/google')
        .then(response => response.data?.clientId || null)
        .catch(() => {
            clientIdRequest = null
            return null
        })
    return clientIdRequest
}

let googleScript
function loadGoogle() {
    googleScript ??= new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.onload = () => resolve(window.google)
        script.onerror = () => {
            googleScript = null
            reject(new Error('Google sign-in did not load'))
        }
        document.head.appendChild(script)
    })
    return googleScript
}

/**
 * "Continue with Google" on the login and register pages. A Google account with no account here yet picks a
 * username first (the backend suggests one from the Google name); onNewAccount(true) lets the page hide its own
 * form meanwhile.
 */
function GoogleSignIn({ onNewAccount }) {
    const buttonRef = useRef(null)
    const { loginWithGoogle } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState('')
    // Set when the Google account needs a username: { credential, email }
    const [newAccount, setNewAccount] = useState(null)
    const [username, setUsername] = useState('')
    const [clientId, setClientId] = useState(null)

    useEffect(() => {
        let cancelled = false
        loadClientId().then(id => !cancelled && setClientId(id))
        return () => { cancelled = true }
    }, [])

    async function handleCredential(credential) {
        setError('')
        try {
            const needs = await loginWithGoogle(credential)
            if (needs) {
                setNewAccount({ credential, email: needs.email })
                setUsername(needs.suggestedUsername)
                onNewAccount?.(true)
            } else {
                navigate('/events')
            }
        } catch (err) {
            setError(err.response?.data?.message || "Google sign-in didn't work. Try again.")
        }
    }

    // Google keeps the first callback it is given, so that one calls this ref, which always holds the current code
    const onCredential = useRef(null)
    useEffect(() => {
        onCredential.current = handleCredential
    })

    // The button is drawn by Google again each time it is on screen (also after "Back")
    useEffect(() => {
        if (!clientId || newAccount) return
        let cancelled = false
        loadGoogle().then(google => {
            if (cancelled || !buttonRef.current) return
            google.accounts.id.initialize({
                client_id: clientId,
                callback: ({ credential }) => onCredential.current(credential),
            })
            google.accounts.id.renderButton(buttonRef.current, {
                theme: 'filled_black',
                size: 'large',
                text: 'continue_with',
                // In English like the rest of the site; otherwise Google uses the browser's language
                locale: 'en',
                width: Math.min(buttonRef.current.offsetWidth || 320, 400),
            })
        }).catch(() => {
            if (!cancelled) setError('Google sign-in could not load. Use a username and password instead.')
        })
        return () => { cancelled = true }
    }, [clientId, newAccount])

    function back() {
        setNewAccount(null)
        setError('')
        onNewAccount?.(false)
    }

    async function createAccount(e) {
        e.preventDefault()
        setError('')
        try {
            await loginWithGoogle(newAccount.credential, username.trim())
            navigate('/events')
        } catch (err) {
            const status = err.response?.status
            setError(status === 409 ? 'That username is taken. Try another one.'
                : status === 401 ? 'The Google sign-in expired. Go back and continue with Google again.'
                    : err.response?.data?.errors?.username ? 'A username has 3 to 50 characters.'
                        : err.response?.data?.message || 'Could not make the account. Try again.')
        }
    }

    if (!clientId) return null

    if (newAccount) {
        return (
            <form onSubmit={createAccount} className="grid gap-4 mt-4">
                <p className="muted text-sm m-0">
                    New here with Google ({newAccount.email}). Pick the username others will see:
                </p>
                {error && <p className="notice m-0">{error}</p>}
                <div>
                    <label htmlFor="google-username" className="field-label">Username</label>
                    <input
                        id="google-username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="field"
                    />
                </div>
                <button type="submit" className="btn btn--primary btn--block">Create account</button>
                <button type="button" className="btn btn--ghost btn--block" onClick={back}>Back</button>
            </form>
        )
    }

    return (
        <div className="grid gap-4 mt-4">
            {error && <p className="notice m-0">{error}</p>}
            <div ref={buttonRef} className="google-button" />
            <p className="mono text-xs muted text-center m-0">// or with a username</p>
        </div>
    )
}

export default GoogleSignIn
