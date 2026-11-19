import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    addCrewItem, deleteCrewItem, fetchCrew, fetchCrewPreview, fetchEventById, fetchTimetable, joinCrew, newCrewLink,
    pickCrewSet, removeCrewMember, setCrewCamp, toggleCrewItem, unpickCrewSet,
} from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'
import { rememberAfterLogin } from '../utils/afterLogin.js'
import { fetchCrewForecast, openSuggestions, typeSuggestions, weatherSuggestions } from '../components/crew/packing.js'

const DAY_TIME = new Intl.DateTimeFormat('en', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const DATE = new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric', month: 'short' })
const date = (d) => DATE.format(new Date(`${d}T12:00:00`))
const setTime = (t) => DAY_TIME.format(new Date(t))

// Days until the event starts (the venue's calendar day against the viewer's), 0 on the day, negative once it began
function daysUntil(startsOn) {
    const today = new Date()
    const start = new Date(`${startsOn}T00:00:00`)
    return Math.round((start - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000)
}

const errorText = (err, fallback) => err?.response?.data?.message || fallback

// A crew: a private group for one event, opened with its link. You need an account to join (the link sends
// guests to log in and brings them back here). Members see each other, the packing list and the must-see sets.
function Crew() {
    const { code } = useParams()
    const { user, loading } = useAuth()
    const navigate = useNavigate()
    const [crew, setCrew] = useState(null)
    const [preview, setPreview] = useState(null)
    const [error, setError] = useState('')

    usePageMeta({ title: crew ? `${crew.name} · Crew` : 'Crew', path: `/crew/${code}`, noindex: true })

    useEffect(() => {
        if (loading || !user) return
        let alive = true
        fetchCrewPreview(code)
            .then((p) => {
                if (!alive) return
                setPreview(p)
                if (p.member) return fetchCrew(code).then((c) => alive && setCrew(c))
            })
            .catch((err) => alive && setError(errorText(err, 'This crew link doesn\'t work any more.')))
        return () => { alive = false }
    }, [code, user, loading])

    if (loading) return <div className="page"><p className="muted text-sm">Loading…</p></div>

    if (!user) {
        const goLogin = (to) => { rememberAfterLogin(`/crew/${code}`); navigate(to) }
        return (
            <div className="page max-w-xl">
                <header className="page-head">
                    <div className="page-head__tag">// Crew · invite</div>
                    <h1 className="page-title">You're invited aboard</h1>
                </header>
                <section className="panel grid gap-3">
                    <p className="soft m-0">Someone invited you to their crew for an event on Map of Psy. Crews are private, so you need a free account to see who's in it and join.</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn--primary" onClick={() => goLogin('/register')}>Create an account</button>
                        <button type="button" className="btn btn--ghost" onClick={() => goLogin('/login')}>Log in</button>
                    </div>
                    <p className="muted text-xs m-0">After that you come straight back to this crew.</p>
                </section>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page max-w-xl">
                <header className="page-head"><div className="page-head__tag">// Crew</div><h1 className="page-title">Crew not found</h1></header>
                <p className="soft">{error} Ask your friends for a fresh link.</p>
            </div>
        )
    }

    if (preview && !preview.member) {
        const join = () => joinCrew(code).then((c) => { setCrew(c); setPreview({ ...preview, member: true }) })
            .catch((err) => setError(errorText(err, 'Could not join this crew.')))
        return (
            <div className="page max-w-xl">
                <header className="page-head">
                    <div className="page-head__tag">// Crew · aboard {preview.eventName}</div>
                    <h1 className="page-title">{preview.name}</h1>
                </header>
                <section className="panel grid gap-3">
                    <p className="soft m-0">{date(preview.startsOn)} · {preview.members} {preview.members === 1 ? 'person' : 'people'} aboard</p>
                    <p className="muted text-sm m-0">Joining marks you as going to {preview.eventName}.</p>
                    <div><button type="button" className="btn btn--primary" onClick={join}>Join the crew</button></div>
                </section>
            </div>
        )
    }

    if (!crew) return <div className="page"><p className="muted text-sm">Loading…</p></div>
    return <CrewView crew={crew} setCrew={setCrew} onGone={() => navigate(`/events/${crew.eventId}`)} />
}

function CrewView({ crew, setCrew, onGone }) {
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const run = (promise) => promise.then((c) => { if (c) setCrew(c); setError('') })
        .catch((err) => setError(errorText(err, 'That didn\'t work. Try again.')))
    const link = `${window.location.origin}/crew/${crew.code}`
    const [copied, setCopied] = useState(false)
    const days = daysUntil(crew.startsOn)

    const copy = () => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
    const freshLink = () => newCrewLink(crew.code).then((c) => { setCrew(c); navigate(`/crew/${c.code}`, { replace: true }) })
        .catch((err) => setError(errorText(err, 'Could not make a new link.')))
    const leave = (username, self) => {
        const question = self
            ? (crew.captain ? 'You are the captain: leaving deletes the crew for everyone. Delete it?' : 'Leave this crew?')
            : `Remove ${username} from the crew?`
        if (!window.confirm(question)) return
        removeCrewMember(crew.code, username)
            .then(() => (self ? onGone() : fetchCrew(crew.code).then(setCrew)))
            .catch((err) => setError(errorText(err, 'Could not do that.')))
    }

    return (
        <div className="page max-w-3xl">
            <header className="page-head">
                <div className="page-head__tag">// Crew · aboard <Link to={`/events/${crew.eventId}`}>{crew.eventName}</Link></div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="page-title">{crew.name}</h1>
                        <p className="soft text-sm m-0">{date(crew.startsOn)}{crew.endsOn !== crew.startsOn ? ` – ${date(crew.endsOn)}` : ''} · {crew.members.length} crew</p>
                    </div>
                    <div className="text-right">
                        <div className="mono text-xl" style={{ color: 'var(--accent)' }}>
                            {days > 0 ? `T-${days} ${days === 1 ? 'day' : 'days'}` : days === 0 ? 'Boarding today' : 'Aboard'}
                        </div>
                        {days > 0 && <div className="muted text-xs">to boarding</div>}
                    </div>
                </div>
            </header>

            {error && <p className="text-sm" style={{ color: 'var(--danger, #ff6b8b)' }}>{error}</p>}

            <section className="panel grid gap-3">
                <h2 className="panel__label">Crew</h2>
                <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
                    {crew.members.map((m) => (
                        <li key={m.username} className={`chip${m.captain ? ' is-on' : ''}`}>
                            {m.username}{m.captain ? ' · captain' : ''}{m.me ? ' (you)' : ''}
                            {crew.captain && !m.me && (
                                <button type="button" className="ml-2 muted" aria-label={`Remove ${m.username}`} onClick={() => leave(m.username, false)}>×</button>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn--ghost" onClick={copy}>{copied ? 'Link copied ✓' : '⧉ Copy invite link'}</button>
                    {crew.captain && <button type="button" className="btn btn--ghost" onClick={freshLink}>↻ New link</button>}
                    <button type="button" className="btn btn--ghost" onClick={() => leave(crew.members.find((m) => m.me)?.username, true)}>
                        {crew.captain ? 'Delete crew' : 'Leave crew'}
                    </button>
                </div>
                <p className="muted text-xs m-0">Only people with the link and an account can join (up to 20). Someone the captain removes can't come back with the same link; a new link stops the old one for everyone. The crew is deleted a week after the event.</p>
                <CampSpot crew={crew} run={run} />
            </section>

            <MustSee crew={crew} run={run} />
            <PackingList crew={crew} run={run} />
        </div>
    )
}

function CampSpot({ crew, run }) {
    const [value, setValue] = useState(crew.campSpot || '')
    const [editing, setEditing] = useState(false)
    if (!editing) {
        return (
            <p className="text-sm m-0">
                <span className="muted">Where we camp: </span>{crew.campSpot || <span className="muted">not set yet</span>}{' '}
                <button type="button" className="link text-xs" onClick={() => setEditing(true)}>✎ Edit</button>
            </p>
        )
    }
    return (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(setCrewCamp(crew.code, value)).then(() => setEditing(false)) }}>
            <input className="field flex-1" maxLength={140} value={value} onChange={(e) => setValue(e.target.value)} placeholder="By the big tree, tent with a flag" />
            <button type="submit" className="btn btn--primary">Save</button>
        </form>
    )
}

function MustSee({ crew, run }) {
    const [timetable, setTimetable] = useState(null)
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetchTimetable(crew.eventId, controller.signal).then(setTimetable).catch(() => setTimetable({ sets: [] }))
        return () => controller.abort()
    }, [crew.eventId])

    const chosen = new Set(crew.sets.map((s) => `${s.artist}|${s.startsAt}`))
    const others = (timetable?.sets || []).filter((s) => !chosen.has(`${s.artist}|${s.startsAt}`))

    return (
        <section className="panel grid gap-3">
            <h2 className="panel__label">★ Must-see sets</h2>
            {crew.sets.length === 0 && (
                <p className="muted text-sm m-0">
                    {timetable?.sets?.length
                        ? 'Sets of artists someone in the crew follows show up here on their own. Add any other set below.'
                        : 'No timetable yet. When the organizer adds it, sets of artists your crew follows show up here.'}
                </p>
            )}
            <ul className="grid gap-2 m-0 p-0 list-none">
                {crew.sets.map((s) => (
                    <li key={`${s.artist}|${s.startsAt}`} className="text-sm border-b border-dashed border-[var(--line)] pb-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span><span className="mono muted">{setTime(s.startsAt)}</span> · {s.stage || 'Stage'} · <span className="font-medium">{s.artist}</span></span>
                            {s.addedBy != null && (
                                <button type="button" className="link text-xs" onClick={() => run(unpickCrewSet(crew.code, s.artist, s.startsAt))}>Remove</button>
                            )}
                        </div>
                        <div className="muted text-xs">
                            {s.followedBy.length > 0 && `followed by ${s.followedBy.join(', ')}`}
                            {s.followedBy.length > 0 && s.addedBy != null && ' · '}
                            {s.addedBy != null && `added by ${s.addedBy || 'someone'}`}
                        </div>
                        {s.clashesWith.length > 0 && (
                            <div className="text-xs" style={{ color: '#ffd36e' }}>⚠ clashes with {s.clashesWith.join(', ')}</div>
                        )}
                    </li>
                ))}
            </ul>
            {others.length > 0 && (adding ? (
                <select className="field" defaultValue="" onChange={(e) => {
                    const s = others[Number(e.target.value)]
                    if (s) run(pickCrewSet(crew.code, s.artist, s.startsAt)).then(() => setAdding(false))
                }}>
                    <option value="" disabled>Pick a set from the timetable…</option>
                    {others.map((s, i) => (
                        <option key={`${s.artist}|${s.startsAt}`} value={i}>{setTime(s.startsAt)} · {s.stage || 'Stage'} · {s.artist}</option>
                    ))}
                </select>
            ) : (
                <div><button type="button" className="btn btn--ghost" onClick={() => setAdding(true)}>+ Add a set</button></div>
            ))}
        </section>
    )
}

function PackingList({ crew, run }) {
    const [name, setName] = useState('')
    const [forecast, setForecast] = useState(null)
    const indoor = /club|indoor/i.test(crew.eventType || '')

    useEffect(() => {
        const controller = new AbortController()
        fetchEventById(crew.eventId)
            .then((e) => e && fetchCrewForecast(e.lat, e.lon, crew.startsOn, crew.endsOn, controller.signal))
            .then((days) => days && setForecast(days))
        return () => controller.abort()
    }, [crew.eventId, crew.startsOn, crew.endsOn])

    const suggestions = useMemo(
        () => openSuggestions([...weatherSuggestions(forecast, indoor), ...typeSuggestions(crew.eventType, crew.eventName)], crew.items).slice(0, 8),
        [forecast, indoor, crew.eventType, crew.eventName, crew.items],
    )
    const add = (n) => run(addCrewItem(crew.code, n))
    const open = crew.items.filter((i) => !i.bringer).length

    return (
        <section className="panel grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="panel__label m-0">Packing list</h2>
                {crew.items.length > 0 && <span className="muted text-xs">{open === 0 ? 'everything has someone ✓' : `${open} still without anyone`}</span>}
            </div>
            {suggestions.length > 0 && (
                <div className="grid gap-2">
                    <span className="muted text-xs">Suggested for this event{forecast ? ' and its weather' : ''}. Tap to add.</span>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => (
                            <button key={s.name} type="button" className="chip" style={{ borderStyle: 'dashed' }} onClick={() => add(s.name)}>
                                + {s.name} <span className="muted">· {s.why}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <ul className="grid gap-0 m-0 p-0 list-none">
                {crew.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 text-sm py-2 border-b border-dashed border-[var(--line)]">
                        <span>{i.name}</span>
                        <span className="flex items-center gap-2">
                            {i.bringer
                                ? (
                                    <button type="button" className="chip is-on" disabled={!i.mine} title={i.mine ? 'Tap to take it back' : undefined}
                                        onClick={() => i.mine && run(toggleCrewItem(crew.code, i.id))}>
                                        {i.mine ? 'You bring it' : `${i.bringer} brings it`}
                                    </button>
                                )
                                : <button type="button" className="btn btn--ghost" onClick={() => run(toggleCrewItem(crew.code, i.id))}>I'll bring it</button>}
                            {i.canDelete && (
                                <button type="button" className="muted" aria-label={`Delete ${i.name}`} onClick={() => run(deleteCrewItem(crew.code, i.id))}>×</button>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add(name.trim()).then(() => setName('')) }}>
                <input className="field flex-1" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Hammock" aria-label="Add to the packing list" />
                <button type="submit" className="btn btn--ghost">+ Add</button>
            </form>
        </section>
    )
}

export default Crew
