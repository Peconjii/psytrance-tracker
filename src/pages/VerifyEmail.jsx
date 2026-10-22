import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../api/backend'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'

// One request per link, also when React runs the effect twice (development): a link works only once
const sent = new Map()
const verifyOnce = (token) => {
    if (!sent.has(token)) sent.set(token, verifyEmail(token))
    return sent.get(token)
}

// Opened from the emailed link: /verify-email?token=... Confirms the email right away, nothing to fill in.
function VerifyEmail() {
    usePageMeta({ title: 'Confirm Email', path: '/verify-email', noindex: true })
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const { user, updateUser } = useAuth()
    const [result, setResult] = useState({ done: false, error: '' })

    useEffect(() => {
        if (!token) return
        let cancelled = false
        verifyOnce(token)
            .then(() => { if (!cancelled) setResult({ done: true, error: '' }) })
            .catch(err => {
                if (!cancelled) setResult({ done: false, error: err.response?.data?.message || 'Something went wrong. Please try again.' })
            })
        return () => { cancelled = true }
    }, [token])

    // The logged-in account is the one confirmed (usually): show it without reloading
    useEffect(() => {
        if (result.done && user && !user.emailVerified) updateUser({ emailVerified: true })
    }, [result.done, user, updateUser])

    return (
        <div className="page page--narrow">
            <div className="panel">
                <div className="page-head__tag">// Crew access</div>
                <h1 className="page-title">Confirm your email</h1>
                {!token ? (
                    <p className="notice mt-4">This page needs the link from your email.</p>
                ) : result.error ? (
                    <p className="notice mt-4">
                        {result.error} <Link to="/profile" className="link">Your profile</Link>
                    </p>
                ) : result.done ? (
                    <div className="grid gap-4 mt-4">
                        <p className="notice notice--ok m-0">Your email is confirmed. You can add events to the map now.</p>
                        <Link to={user ? '/events/new' : '/login'} className="btn btn--primary btn--block">
                            {user ? 'Add an event' : 'Go to login'}
                        </Link>
                    </div>
                ) : (
                    <p className="mono text-xs muted mt-4">Checking the link…</p>
                )}
            </div>
        </div>
    )
}

export default VerifyEmail
