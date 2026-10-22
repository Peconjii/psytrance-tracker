import { useState } from 'react'
import { resendVerification } from '../api/backend'
import { useAuth } from '../context/AuthContext'

// For an account that hasn't confirmed its email yet: what it unlocks, and "send the link again". Nothing otherwise.
function VerifyEmailNotice({ reason = 'Confirm your email to add events to the map.' }) {
    const { user } = useAuth()
    const [status, setStatus] = useState({ sending: false, message: '', error: '' })

    if (!user || user.emailVerified) return null

    const resend = async () => {
        setStatus({ sending: true, message: '', error: '' })
        try {
            const { message } = await resendVerification()
            setStatus({ sending: false, message, error: '' })
        } catch (err) {
            setStatus({ sending: false, message: '', error: err.response?.data?.message || 'Could not send. Try again.' })
        }
    }

    return (
        <section className="panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h2 className="panel__label">Email not confirmed</h2>
                <p className="text-sm m-0 max-w-md muted">
                    {reason} We sent a link to <strong>{user.email}</strong> when you registered.
                </p>
                {status.message && <p className="mono text-xs soft mt-2 mb-0" role="status">{status.message}</p>}
                {status.error && <p className="notice mt-2 mb-0">{status.error}</p>}
            </div>
            <button type="button" className="btn shrink-0" onClick={resend} disabled={status.sending}>
                {status.sending ? 'Sending…' : 'Send the link again'}
            </button>
        </section>
    )
}

export default VerifyEmailNotice
