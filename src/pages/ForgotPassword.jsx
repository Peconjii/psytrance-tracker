import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/backend'

function ForgotPassword() {
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
        <div className="min-h-[85vh] px-4 flex items-center justify-center">
            <div className="bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl w-full max-w-md border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <h2 className="text-white text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    Reset Password
                </h2>

                {sent ? (
                    // Deliberately the same message whether or not the email has an account
                    <p className="text-slate-300 text-center text-sm mt-4 bg-cyan-500/10 py-3 px-4 rounded-xl border border-cyan-500/20">
                        If an account exists for <span className="text-cyan-300 font-medium">{email.trim()}</span>, we've sent a link
                        to reset your password. It expires in 30 minutes, so check your inbox (and spam folder).
                    </p>
                ) : (
                    <>
                        <p className="text-slate-400 text-center text-sm mb-6">
                            Enter the email you registered with and we'll send you a reset link.
                        </p>
                        {error && <p className="text-red-400 text-center text-sm mb-4 bg-red-500/10 py-2 rounded-xl border border-red-500/20">{error}</p>}
                        <form onSubmit={handleSubmit}>
                            <input
                                type="email"
                                required
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950/80 text-white px-4 py-3 rounded-xl mb-6 focus:outline-none focus:border-cyan-400 border border-slate-800 text-sm transition-all"
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer disabled:opacity-50"
                            >
                                {submitting ? 'Sending...' : 'Send reset link'}
                            </button>
                        </form>
                    </>
                )}

                <p className="text-slate-400 text-center text-xs mt-6">
                    Remembered it? <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Back to login</Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword
