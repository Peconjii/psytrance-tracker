import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const when = (iso) => (iso ? WHEN.format(new Date(iso)) : 'not since the last restart')

// Admin panel home: what waits for an admin, the crew, the ships, the artist index and the most followed artists
function AdminDashboard() {
    usePageMeta({ title: 'Dashboard', path: '/admin', noindex: true })
    const { user } = useAuth()
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        fetchAdminDashboard(controller.signal)
            .then(setData)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the dashboard.') })
        return () => controller.abort()
    }, [])

    // An editor sees only what they can work on (no messages, requests or accounts)
    const admin = Boolean(user?.admin)
    const waiting = data && [
        admin && { count: data.waiting.feedback, label: 'New messages', to: '/admin/feedback' },
        { count: data.waiting.events, label: 'Events to approve', to: '/admin/our-events' },
        admin && { count: data.waiting.artistRequests, label: 'Requests and claims', to: '/admin/requests' },
        { count: data.harbour, label: 'Ships in the harbour', to: '/admin/events' },
    ].filter(Boolean)

    return (
        <div className="page">
            <AdminTabs />
            <header className="page-head">
                <div className="page-head__tag">// Admin · bridge</div>
                <h1 className="page-title">Dashboard</h1>
            </header>
            {error && <p className="notice">{error}</p>}
            {!data ? (
                !error && <p className="mono text-xs muted">Loading…</p>
            ) : (
                <div className="grid gap-6">
                    <section>
                        <h2 className="panel__label">Waiting for you</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {waiting.map(w => (
                                <Link key={w.to} to={w.to} className="stat no-underline" style={w.count ? { '--fam': 'var(--accent)' } : undefined}>
                                    <span className="stat__value">{w.count}</span>
                                    <span className="stat__label">{w.label} →</span>
                                </Link>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="panel__label">Crew and ships</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {admin ? (
                                <Link to="/admin/users" className="stat no-underline"><span className="stat__value">{data.users}</span><span className="stat__label">Accounts →</span></Link>
                            ) : (
                                <div className="stat"><span className="stat__value">{data.users}</span><span className="stat__label">Accounts</span></div>
                            )}
                            <div className="stat"><span className="stat__value">{data.newUsersThisWeek}</span><span className="stat__label">New this week</span></div>
                            <div className="stat"><span className="stat__value">{data.ships}</span><span className="stat__label">Ships, next 30 days</span></div>
                            <div className="stat"><span className="stat__value">{data.harbour}</span><span className="stat__label">In the harbour</span></div>
                        </div>
                    </section>

                    <section className="panel">
                        <h2 className="panel__label">Artist index</h2>
                        <p className="soft text-sm m-0">
                            Last run: <strong>{when(data.index.lastRunAt)}</strong>
                            {data.index.lastRunAt && <> · read {data.index.lastRead} line-ups</>}
                        </p>
                        {data.index.lastError ? (
                            <p className="notice mt-3 mb-0">Last error {when(data.index.lastErrorAt)}: {data.index.lastError}</p>
                        ) : (
                            <p className="mono text-xs muted mt-2 mb-0">No errors since the last restart.</p>
                        )}
                    </section>

                    <section className="panel">
                        <h2 className="panel__label">Most followed artists</h2>
                        {data.mostFollowed.length === 0 ? (
                            <p className="muted text-sm m-0">Nobody follows anyone yet.</p>
                        ) : (
                            <ul className="rows">
                                {data.mostFollowed.map(a => (
                                    <li key={a.slug} className="rows__item">
                                        <Link className="rows__name link" to={`/artists/${encodeURIComponent(a.slug)}`}>{a.name}</Link>
                                        <span className="rows__meta">{a.followers} {a.followers === 1 ? 'follower' : 'followers'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
