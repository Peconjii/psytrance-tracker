import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'

function Login() {
    usePageMeta({ title: 'Login', path: '/login', noindex: true })
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()
    // Right after registering: the email the confirmation link went to
    const registered = useLocation().state?.registered

    async function handleSubmit(e) {
        e.preventDefault()
        try {
            await login(username, password)
            navigate('/events')
        } catch (err) {
            // 429: too many wrong passwords for this username, the backend says how long to wait
            setError(err.response?.status === 429 ? err.response.data?.message : 'Invalid username or password')
        }
    }

    return (
        <div className="page page--narrow">
            <div className="panel">
                <div className="page-head__tag">// Crew access</div>
                <h1 className="page-title">Log in</h1>
                {registered && !error && (
                    <p className="notice notice--ok mt-4 mb-4">
                        Account created. We sent a link to {registered}: open it to confirm your email (needed to add
                        events). You can log in already.
                    </p>
                )}
                {error && <p className="notice mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
                    <div>
                        <label htmlFor="login-username" className="field-label">Username</label>
                        <input
                            id="login-username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="field"
                        />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="field-label">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="field"
                        />
                    </div>
                    <button type="submit" className="btn btn--primary btn--block mt-2">Log in</button>
                </form>
                <p className="muted text-sm mt-6 mb-1">
                    No account yet? <Link to="/register" className="link">Register</Link>
                </p>
                <p className="muted text-sm m-0">
                    Forgot your password? <Link to="/forgot-password" className="link">Reset it</Link>
                </p>
            </div>
        </div>
    )
}

export default Login