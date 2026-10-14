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
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-1.5 ${
                going
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : failed
                        ? 'bg-slate-950/50 text-red-300 border-red-500/40'
                        : 'bg-slate-950/50 text-slate-300 border-slate-800 hover:text-white hover:border-emerald-500/40'
            } ${className}`}
        >
            <span>{going ? "✓ I'm going" : "I'm going"}</span>
            {count > 0 && (
                <span className={`px-1.5 rounded-md ${going ? 'bg-emerald-500/20' : 'bg-slate-800/80 text-slate-400'}`}>
                    {count}
                </span>
            )}
        </button>
    )
}

export default GoingButton
