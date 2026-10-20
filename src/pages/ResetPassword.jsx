import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/backend'
import usePageMeta from '../hooks/usePageMeta.js'

const MIN_PASSWORD_LENGTH = 8 // same rule as the backend's ResetPasswordRequest

// Opened from the emailed link: /reset-password?token=...
function ResetPassword() {
    usePageMeta({ title: 'Reset Password', path: '/reset-password', noindex: true })
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        if (password.length < MIN_PASSWORD_LENGTH) {
            return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        }
        if (password !== confirmPassword) {
            return setError("Passwords don't match.")
        }

        setSubmitting(true)
        setError('')
        try {
            await resetPassword(token, password)
            setDone(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="page page--narrow">
            <div className="panel">
                <div className="page-head__tag">// Crew access</div>
                <h1 className="page-title">Choose a new password</h1>

                {!token ? (
                    <p className="notice mt-4">
                        This page needs the link from your reset email.{' '}
                        <Link to="/forgot-password" className="link">Request a new link</Link>
                    </p>
                ) : done ? (
                    <div className="grid gap-4 mt-4">
                        <p className="notice notice--ok m-0">Your password has been changed.</p>
                        <Link to="/login" className="btn btn--primary btn--block">Go to login</Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <p className="notice mt-4 mb-4">
                                {error}
                                {error.includes('expired') && (
                                    <> <Link to="/forgot-password" className="link">Get a new link</Link></>
                                )}
                            </p>
                        )}
                        <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
                            <div>
                                <label htmlFor="reset-password" className="field-label">New password (min. {MIN_PASSWORD_LENGTH} characters)</label>
                                <input
                                    id="reset-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="field"
                                />
                            </div>
                            <div>
                                <label htmlFor="reset-password-again" className="field-label">Repeat new password</label>
                                <input
                                    id="reset-password-again"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="field"
                                />
                            </div>
                            <button type="submit" disabled={submitting} className="btn btn--primary btn--block">
                                {submitting ? 'Saving...' : 'Save new password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default ResetPassword
