import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/backend'
import usePageMeta from '../hooks/usePageMeta.js'

function ForgotPassword() {
    usePageMeta({ title: 'Forgot Password', path: '/forgot-password', noindex: true })
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        setSubmitting(true)
        setError('')
        try {
            await requestPasswordReset(email.trim())
            setSent(true)
        } catch (err) {
            setError(err.response?.data?.errors?.email
                ? 'Please enter a valid email address.'
                : 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="page page--narrow">
            <div className="panel">
                <div className="page-head__tag">// Crew access</div>
                <h1 className="page-title">Reset password</h1>

                {sent ? (
                    // Deliberately the same message whether or not the email has an account
                    <p className="notice notice--ok mt-4">
                        If an account exists for <strong className="font-medium">{email.trim()}</strong>, we've sent a link
                        to reset your password. It expires in 30 minutes, so check your inbox (and spam folder).
                    </p>
                ) : (
                    <>
                        <p className="muted text-sm mt-0 mb-4">
                            Enter the email you registered with and we'll send you a reset link.
                        </p>
                        {error && <p className="notice mb-4">{error}</p>}
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div>
                                <label htmlFor="forgot-email" className="field-label">Email</label>
                                <input
                                    id="forgot-email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="field"
                                />
                            </div>
                            <button type="submit" disabled={submitting} className="btn btn--primary btn--block">
                                {submitting ? 'Sending...' : 'Send reset link'}
                            </button>
                        </form>
                    </>
                )}

                <p className="muted text-sm mt-6 mb-0">
                    Remembered it? <Link to="/login" className="link">Back to login</Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword
