import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/backend'

const MIN_PASSWORD_LENGTH = 8 // same rule as the backend's ResetPasswordRequest

// Opened from the emailed link: /reset-password?token=...
function ResetPassword() {
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

    const inputClass = "w-full bg-slate-950/80 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-400 border border-slate-800 text-sm transition-all"

    return (
        <div className="min-h-[85vh] px-4 flex items-center justify-center">
            <div className="bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl w-full max-w-md border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <h2 className="text-white text-3xl font-extrabold text-center mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    Choose a New Password
                </h2>

                {!token ? (
                    <p className="text-red-400 text-center text-sm bg-red-500/10 py-3 px-4 rounded-xl border border-red-500/20">
                        This page needs the link from your reset email.{' '}
                        <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 font-medium underline">Request a new link</Link>
                    </p>
                ) : done ? (
                    <div className="text-center">
                        <p className="text-slate-300 text-sm mb-6 bg-cyan-500/10 py-3 px-4 rounded-xl border border-cyan-500/20">
                            Your password has been changed.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-slate-950 font-bold py-3 rounded-xl transition-all"
                        >
                            Go to login
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <p className="text-red-400 text-center text-sm mb-4 bg-red-500/10 py-2 px-3 rounded-xl border border-red-500/20">
                                {error}
                                {error.includes('expired') && (
                                    <> <Link to="/forgot-password" className="text-cyan-400 underline">Get a new link</Link></>
                                )}
                            </p>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="password"
                                placeholder={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClass}
                            />
                            <input
                                type="password"
                                placeholder="Repeat new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClass}
                            />
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer disabled:opacity-50"
                            >
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
