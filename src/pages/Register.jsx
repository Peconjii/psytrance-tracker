import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'
import BotTrap from '../components/BotTrap.jsx'
import GoogleSignIn from '../components/GoogleSignIn.jsx'

function Register() {
    usePageMeta({ title: 'Register', path: '/register', noindex: true })
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    // Never shown to people; bots fill it in
    const [website, setWebsite] = useState('')
    const [agreed, setAgreed] = useState(false)
    // A Google account without an account here is picking a username: this form is hidden meanwhile
    const [googleStep, setGoogleStep] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        try {
            await register(username, email, password, website)
            navigate('/login', { state: { registered: email } })
        } catch (err) {
            // Backend sends { message } and, for validation errors, { errors: { field: reason } }
            const data = err.response?.data
            const fieldErrors = data?.errors
                ? Object.entries(data.errors).map(([field, reason]) => `${field}: ${reason}`).join(', ')
                : null
            setError(fieldErrors || data?.message || 'Registration failed. Please try again.')
        }
    }

    return (
        <div className="page page--narrow">
            <div className="panel">
                <div className="page-head__tag">// Join the crew</div>
                <h1 className="page-title">Register</h1>
                {error && <p className="notice mb-4">{error}</p>}
                <GoogleSignIn onNewAccount={setGoogleStep} />
                <p className="mono text-xs muted mt-2 mb-0">
                    By continuing with Google you agree to the <Link to="/terms" className="link">Terms</Link> and{' '}
                    <Link to="/privacy" className="link">Privacy</Link>.
                </p>
                {!googleStep && <>
                <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
                    <div>
                        <label htmlFor="register-username" className="field-label">Username</label>
                        <input
                            id="register-username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="field"
                        />
                    </div>
                    <div>
                        <label htmlFor="register-password" className="field-label">Password</label>
                        <input
                            id="register-password"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="field"
                        />
                    </div>
                    <div>
                        <label htmlFor="register-email" className="field-label">Email</label>
                        <input
                            id="register-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="field"
                        />
                    </div>
                    <BotTrap id="register-trap" value={website} onChange={setWebsite} />
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                        <span>I agree to the <Link to="/terms" className="link">Terms</Link> and{' '}
                            <Link to="/privacy" className="link">Privacy</Link></span>
                    </label>
                    <button type="submit" className="btn btn--primary btn--block mt-2" disabled={!agreed}>Create account</button>
                    <p className="mono text-xs muted m-0">
                        We keep your username, email and what you do on the site, and nothing more.{' '}
                        <Link to="/privacy" className="link">What and why</Link>
                    </p>
                </form>
                <p className="muted text-sm mt-6 mb-0">
                    Already have an account? <Link to="/login" className="link">Log in</Link>
                </p>
                </>}
            </div>
        </div>
    )
}

export default Register