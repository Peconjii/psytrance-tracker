import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCrew, fetchMyCrewsForEvent } from '../../api/backend.js'
import { useAuth } from '../../context/AuthContext'

// "Crews" on an event page: your crews for this event, and starting a new one.
// A crew is private: only people with its link and an account see it.
function CrewPanel({ eventId, eventOver }) {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [crews, setCrews] = useState(null)
    const [naming, setNaming] = useState(false)
    const [name, setName] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (!user) return
        let alive = true
        fetchMyCrewsForEvent(eventId).then((c) => alive && setCrews(c)).catch(() => alive && setCrews([]))
        return () => { alive = false }
    }, [eventId, user])

    if (eventOver) return null

    const start = (e) => {
        e.preventDefault()
        if (!name.trim()) return
        createCrew(eventId, name.trim())
            .then((c) => navigate(`/crew/${c.code}`))
            .catch((err) => setError(err?.response?.data?.message || 'Could not start the crew.'))
    }

    return (
        <section className="panel grid gap-3">
            <h2 className="panel__label">Crew</h2>
            {!user && (
                <p className="muted text-sm m-0">
                    Going with friends? <Link to="/login">Log in</Link> and start a crew: a private page with a shared packing list and the sets you can't miss.
                </p>
            )}
            {user && crews?.length > 0 && (
                <ul className="grid gap-2 m-0 p-0 list-none">
                    {crews.map((c) => (
                        <li key={c.code} className="text-sm">
                            <Link to={`/crew/${c.code}`} className="link">{c.name} →</Link>
                            <span className="muted"> · {c.members} aboard</span>
                        </li>
                    ))}
                </ul>
            )}
            {user && crews?.length === 0 && !naming && (
                <p className="soft text-sm m-0">Going with friends? Start a crew: invite them with a link, split the packing list and see which sets you can't miss.</p>
            )}
            {user && (naming ? (
                <form className="flex flex-wrap gap-2" onSubmit={start}>
                    <input className="field flex-1" autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ekipa iz Novog Sada" aria-label="Crew name" />
                    <button type="submit" className="btn btn--primary">Start crew</button>
                </form>
            ) : (
                <div><button type="button" className="btn btn--ghost" onClick={() => setNaming(true)}>+ Start a crew</button></div>
            ))}
            {error && <p className="text-sm m-0" style={{ color: '#ff6b8b' }}>{error}</p>}
        </section>
    )
}

export default CrewPanel
