import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setGoing } from '../api/backend.js'

// "I'm going" toggle with how many people are going. `status` is { count, going } from the
// backend (null while loading); the parent keeps it and gets the new one through `onChange`.
function GoingButton({ eventId, status, onChange, className = '' }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [failed, setFailed] = useState(false)

    const going = Boolean(user && status?.going)
    const count = status?.count ?? 0

    const toggle = async () => {
        // Going is saved per account, so guests are sent to log in first
        if (!user) return navigate('/login')
        setSaving(true)
        setFailed(false)
        try {
            onChange(await setGoing(eventId, !going))
        } catch (err) {
            console.error('Could not update going:', err)
            setFailed(true)
        } finally {
            setSaving(false)
        }
    }

    return (
        <button
            onClick={toggle}
            disabled={saving}
            title={failed ? 'Could not save, try again' : going ? "You're going. Click to undo" : 'Let others know you are going'}
            className={`btn${going ? ' is-on' : ''}${failed ? ' btn--danger' : ''} ${className}`}
        >
            <span>{going ? "✓ I'm going" : "I'm going"}</span>
            {count > 0 && <span className="btn__count">{count}</span>}
        </button>
    )
}

export default GoingButton
