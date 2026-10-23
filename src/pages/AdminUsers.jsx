import { useEffect, useState } from 'react'
import { fetchAdminUsers, setUserRole } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import UserPages from '../components/UserPages.jsx'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const ROLES = [
    { id: '', label: 'User' },
    { id: 'EDITOR', label: 'Editor' },
    { id: 'ADMIN', label: 'Admin' },
]
// Not a role of the account: picking one opens the search for the page they own (see UserPages, PageTrust)
const PAGE_ROLES = [
    { kind: 'ARTIST', label: 'Artist (DJ, producer, live act)…' },
    { kind: 'ORGANIZER', label: 'Organizer…' },
    { kind: 'LABEL', label: 'Label…' },
    { kind: 'FESTIVAL', label: 'Festival…' },
]

// Admin panel: who has an account, newest first, what they use (follows, saved events, "I'm going"...) and their role.
// An editor fixes the content (events, genres, added events, reviews); an admin may do everything.
function AdminUsers() {
    usePageMeta({ title: 'Users', path: '/admin/users', noindex: true })
    const { user } = useAuth()
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [team, setTeam] = useState(false)
    const [loaded, setLoaded] = useState({ key: null, data: null })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(null)
    // Bumped to load the users again after a page was linked, unlinked or trusted
    const [version, setVersion] = useState(0)
    const key = query + '|' + team
    const data = loaded.key === key ? loaded.data : null

    // A short pause after typing, so not every key is a request
    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        const controller = new AbortController()
        fetchAdminUsers(query, team, controller.signal)
            .then(found => setLoaded({ key: query + '|' + team, data: found }))
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the users.') })
        return () => controller.abort()
    }, [query, team, version])

    const changeRole = async (u, role) => {
        setSaving(u.username)
        setError('')
        try {
            const saved = await setUserRole(u.username, role || null)
            setLoaded(l => ({ ...l, data: { ...l.data, users: l.data.users.map(x => (x.id === u.id ? { ...x, role: saved.role } : x)) } }))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not change the role.')
        } finally {
            setSaving(null)
        }
    }

    // Per account: the kind of page being linked (ARTIST, ORGANIZER, LABEL, FESTIVAL or ANY), or none
    const [linking, setLinking] = useState({})
    const pickRole = (u, value) => {
        if (value.startsWith('PAGE:')) setLinking(l => ({ ...l, [u.id]: value.slice('PAGE:'.length) }))
        else changeRole(u, value)
    }

    const usage = (u) => [
        u.follows && `${u.follows} artists`,
        u.labelFollows && `${u.labelFollows} labels`,
        u.favorites && `${u.favorites} saved`,
        u.going && `${u.going} going`,
        u.reviews && `${u.reviews} reviews`,
        u.eventsAdded && `${u.eventsAdded} events added`,
    ].filter(Boolean).join(' · ')

    return (
        <div className="page">
            <AdminTabs />
            <header className="page-head">
                <div className="page-head__tag">// Admin · crew list</div>
                <h1 className="page-title">Users</h1>
            </header>
            {error && <p className="notice">{error}</p>}
            {data && !team && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="stat"><span className="stat__value">{data.total}</span><span className="stat__label">Accounts</span></div>
                    <div className="stat"><span className="stat__value">{data.newThisWeek}</span><span className="stat__label">New this week</span></div>
                    <div className="stat"><span className="stat__value">{data.verified}</span><span className="stat__label">Email confirmed</span></div>
                </div>
            )}
            <section className="panel">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <input className="field flex-1 min-w-48" aria-label="Search users" placeholder="Name or email…" value={search}
                        onChange={(e) => setSearch(e.target.value)} />
                    <button type="button" className={'chip' + (team ? ' is-on' : '')} aria-pressed={team} onClick={() => setTeam(t => !t)}>
                        Team only
                    </button>
                </div>
                <p className="mono text-xs muted mt-0 mb-3">
                    Editor: events, their genres and timetables, artist genres, added events, reviews. Admin: everything,
                    also the inbox, accounts, requests, history and roles. Under each account: the pages it owns (artist,
                    organizer, label, festival); “trusted” lets its changes there go live without an admin.
                </p>
                {!data ? (
                    <p className="mono text-xs muted m-0">Loading…</p>
                ) : data.users.length === 0 ? (
                    <p className="muted text-sm m-0">{team ? 'No admins or editors found.' : 'Nobody found.'}</p>
                ) : (
                    <ul className="rows">
                        {data.users.map(u => (
                            <li key={u.id} className="rows__item flex-wrap gap-2">
                                <span className="rows__name">
                                    {u.username}
                                    {u.role && <span className="badge ml-2">{u.role.toLowerCase()}</span>}
                                    {[...new Set(u.pages.map(p => p.kind))].map(kind => (
                                        <span key={kind} className="badge ml-2">{kind.toLowerCase()}</span>
                                    ))}
                                    <span className="block mono text-xs muted">{u.email || 'no email'}{!u.emailVerified && ' · not confirmed'}</span>
                                </span>
                                <span className="rows__meta">
                                    {usage(u) || 'nothing yet'}
                                    <span className="block">{u.createdAt ? `joined ${DAY.format(new Date(u.createdAt))}` : 'join date not recorded'}</span>
                                </span>
                                {u.roleOnServer ? (
                                    <span className="mono text-xs muted shrink-0" title="Set in ADMIN_USERNAMES on the server">admin on the server</span>
                                ) : u.username === user?.username ? (
                                    <span className="mono text-xs muted shrink-0">you</span>
                                ) : (
                                    <select className="field shrink-0" style={{ width: 'auto', minWidth: '8rem' }} aria-label={`Role of ${u.username}`} value={u.role ?? ''}
                                        disabled={saving !== null} onChange={(e) => pickRole(u, e.target.value)}>
                                        <optgroup label="Site role">
                                            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                        </optgroup>
                                        <optgroup label="Owner of a page (pick which next)">
                                            {PAGE_ROLES.map(r => <option key={r.kind} value={'PAGE:' + r.kind}>{r.label}</option>)}
                                        </optgroup>
                                    </select>
                                )}
                                <UserPages user={u} onChanged={() => setVersion(v => v + 1)}
                                    linking={linking[u.id] ?? null} onLinking={(kind) => setLinking(l => ({ ...l, [u.id]: kind }))} />
                            </li>
                        ))}
                    </ul>
                )}
                {data && !team && data.users.length < data.total && !query && (
                    <p className="mono text-xs muted mt-3 mb-0">The newest {data.users.length} are shown; search to find the others.</p>
                )}
            </section>
        </div>
    )
}

export default AdminUsers
