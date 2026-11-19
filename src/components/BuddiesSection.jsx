import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBuddies } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import BuddySettingsForm from './BuddySettingsForm.jsx'
import { countryName, flag } from './countries.js'

// Festival Buddies on an event page: who else is going and chose to be visible.
// Mutual: you see them only when you are going and visible yourself (the backend checks this too).
// `goingKey` changes whenever the user presses "I'm going", so the list reloads.
function BuddiesSection({ eventId, goingKey }) {
    const { user } = useAuth()
    const [data, setData] = useState(null)
    const [reload, setReload] = useState(0)
    const [onlyMine, setOnlyMine] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetchBuddies(eventId, controller.signal).then((d) => d && setData(d))
        return () => controller.abort()
    }, [eventId, goingKey, reload, user?.username])

    if (!data) return null
    const others = data.visibleCount - (data.buddies.some((b) => b.me) ? 1 : 0)
    const me = data.buddies.find((b) => b.me)
    const list = onlyMine && me?.country ? data.buddies.filter((b) => b.country === me.country) : data.buddies

    return (
        <section className="panel">
            <h2 className="panel__label">Festival Buddies</h2>
            {!data.canSee && (
                <div className="grid gap-3">
                    <p className="soft text-sm m-0">
                        {data.visibleCount > 0
                            ? `${data.visibleCount} ${data.visibleCount === 1 ? 'person going is' : 'people going are'} open to meet others.`
                            : 'Find people going to this event, from your country or anywhere.'}
                    </p>
                    {data.reason === 'login' && (
                        <p className="muted text-sm m-0"><Link to="/login">Log in</Link>, press “I'm going” and turn on Festival Buddies to see them.</p>
                    )}
                    {data.reason === 'not-going' && (
                        <p className="muted text-sm m-0">Press “I'm going” first. Only people going can see each other.</p>
                    )}
                    {data.reason === 'not-visible' && (
                        <BuddySettingsForm compact onSaved={() => setReload((n) => n + 1)} />
                    )}
                </div>
            )}
            {data.canSee && (
                <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="muted text-sm m-0">
                            {others > 0 ? `${others} other ${others === 1 ? 'person' : 'people'} going and visible.` : 'Nobody else is visible yet. Share the event with friends.'}
                        </p>
                        {me?.country && others > 0 && (
                            <button type="button" className={`chip${onlyMine ? ' is-on' : ''}`} onClick={() => setOnlyMine((v) => !v)}>
                                {flag(me.country)} From {countryName(me.country)}
                            </button>
                        )}
                    </div>
                    <ul className="grid gap-2 m-0 p-0 list-none">
                        {list.map((b) => (
                            <li key={b.username} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm border-b border-dashed border-[var(--line)] pb-2">
                                <span className="font-medium">{b.username}{b.me && <span className="muted"> (you)</span>}</span>
                                {b.country && <span className="muted" title={countryName(b.country)}>{flag(b.country)} {countryName(b.country)}</span>}
                                {b.instagram && (
                                    <a href={`https://instagram.com/${encodeURIComponent(b.instagram)}`} target="_blank" rel="noreferrer nofollow" className="muted">
                                        @{b.instagram} ↗
                                    </a>
                                )}
                                {b.note && <span className="soft basis-full">{b.note}</span>}
                            </li>
                        ))}
                    </ul>
                    <p className="muted text-xs m-0">You can turn this off any time on your <Link to="/profile">profile</Link>.</p>
                </div>
            )}
        </section>
    )
}

export default BuddiesSection
