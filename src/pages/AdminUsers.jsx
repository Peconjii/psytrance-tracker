import { useEffect, useState } from 'react'
import { fetchAdminUsers } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import usePageMeta from '../hooks/usePageMeta.js'

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Admin panel: who has an account, newest first, and what they use (follows, saved events, "I'm going"...)
function AdminUsers() {
    usePageMeta({ title: 'Users', path: '/admin/users', noindex: true })
    const [search, setSearch] = useState('')
    const [query, setQuery] = useState('')
    const [loaded, setLoaded] = useState({ query: null, data: null })
    const [error, setError] = useState('')
    const data = loaded.query === query ? loaded.data : null

    // A short pause after typing, so not every key is a request
    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim()), 300)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        const controller = new AbortController()
        fetchAdminUsers(query, controller.signal)
            .then(found => setLoaded({ query, data: found }))
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the users.') })
        return () => controller.abort()
    }, [query])

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
            {data && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="stat"><span className="stat__value">{data.total}</span><span className="stat__label">Accounts</span></div>
                    <div className="stat"><span className="stat__value">{data.newThisWeek}</span><span className="stat__label">New this week</span></div>
                    <div className="stat"><span className="stat__value">{data.verified}</span><span className="stat__label">Email confirmed</span></div>
                </div>
            )}
            <section className="panel">
                <input className="field mb-3" aria-label="Search users" placeholder="Name or email…" value={search}
                    onChange={(e) => setSearch(e.target.value)} />
                {!data ? (
                    <p className="mono text-xs muted m-0">Loading…</p>
                ) : data.users.length === 0 ? (
                    <p className="muted text-sm m-0">Nobody found.</p>
                ) : (
                    <ul className="rows">
                        {data.users.map(u => (
                            <li key={u.id} className="rows__item">
                                <span className="rows__name">
                                    {u.username}
                                    {u.admin && <span className="badge ml-2">admin</span>}
                                    <span className="block mono text-xs muted">{u.email || 'no email'}{!u.emailVerified && ' · not confirmed'}</span>
                                </span>
                                <span className="rows__meta">
                                    {usage(u) || 'nothing yet'}
                                    <span className="block">{u.createdAt ? `joined ${DAY.format(new Date(u.createdAt))}` : 'join date not recorded'}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {data && data.users.length < data.total && !query && (
                    <p className="mono text-xs muted mt-3 mb-0">The newest {data.users.length} are shown; search to find the others.</p>
                )}
            </section>
        </div>
    )
}

export default AdminUsers
