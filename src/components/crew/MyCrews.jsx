import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyCrews } from '../../api/backend.js'

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })

// "Your crews" on the profile
function MyCrews() {
    const [crews, setCrews] = useState(null)
    useEffect(() => {
        let alive = true
        fetchMyCrews().then((c) => alive && setCrews(c)).catch(() => alive && setCrews([]))
        return () => { alive = false }
    }, [])
    if (!crews) return null
    if (crews.length === 0) {
        return <p className="muted text-sm m-0">No crews yet. Start one on the page of an event you're going to.</p>
    }
    return (
        <ul className="grid gap-2 m-0 p-0 list-none">
            {crews.map((c) => (
                <li key={c.code} className="text-sm">
                    <Link to={`/crew/${c.code}`} className="link">{c.name}</Link>
                    <span className="muted"> · {c.eventName} · {DATE.format(new Date(`${c.startsOn}T12:00:00`))} · {c.members} aboard</span>
                </li>
            ))}
        </ul>
    )
}

export default MyCrews
