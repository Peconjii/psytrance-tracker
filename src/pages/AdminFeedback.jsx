import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchFeedback, setFeedbackStatus } from '../api/backend.js'
import usePageMeta from '../hooks/usePageMeta.js'

const STATUSES = [
    { value: 'NEW', label: 'New' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'DONE', label: 'Done' },
    { value: 'REJECTED', label: 'Rejected' },
]
const KIND_LABELS = { CORRECTION: 'Correction', COMPLAINT: 'Broken', SUGGESTION: 'Improvement', IDEA: 'Idea', OTHER: 'Other' }
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Admins read and sort the feedback here. The backend checks the admin rights on every request;
// this page only hides itself from everyone else.
function AdminFeedback() {
    usePageMeta({ title: 'Feedback inbox', path: '/admin/feedback', noindex: true })
    const { user } = useAuth()
    const [filter, setFilter] = useState('NEW')
    // Tagged with the filter it belongs to, so switching never shows the old list as the new one
    const [loaded, setLoaded] = useState({ filter: null, items: [], error: null })
    const [saving, setSaving] = useState(null)

    useEffect(() => {
        if (!user?.admin) return
        const controller = new AbortController()
        fetchFeedback(filter || null, controller.signal)
            .then(items => setLoaded({ filter, items, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) {
                    setLoaded({ filter, items: [], error: err.response?.data?.message || 'Could not load feedback.' })
                }
            })
        return () => controller.abort()
    }, [filter, user?.admin])

    if (!user?.admin) {
        return (
            <div className="page page--narrow">
                <p className="notice">This page is for admins.</p>
            </div>
        )
    }

    const changeStatus = async (item, status) => {
        setSaving(item.id)
        try {
            const updated = await setFeedbackStatus(item.id, status)
            setLoaded(prev => ({
                ...prev,
                // Leaves the list when it no longer matches the filter
                items: prev.items.map(i => (i.id === item.id ? updated : i)).filter(i => !filter || i.status === filter),
            }))
        } catch {
            setLoaded(prev => ({ ...prev, error: 'Could not change the status. Try again.' }))
        } finally {
            setSaving(null)
        }
    }

    const loading = loaded.filter !== filter
    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · incoming transmissions</div>
                <h1 className="page-title">Feedback inbox</h1>
            </header>

            <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Show">
                {[...STATUSES, { value: '', label: 'All' }].map(s => (
                    <button key={s.label} className={`chip${filter === s.value ? ' is-on' : ''}`}
                        aria-pressed={filter === s.value} onClick={() => setFilter(s.value)}>
                        {s.label}
                    </button>
                ))}
            </div>

            {loaded.error && <p className="notice mb-4">{loaded.error}</p>}

            {loading ? (
                <p className="mono text-xs muted">Loading...</p>
            ) : loaded.items.length === 0 ? (
                <div className="empty"><p><strong>Nothing here.</strong></p></div>
            ) : (
                <ul className="grid gap-3 list-none p-0 m-0">
                    {loaded.items.map(item => (
                        <li key={item.id} className="panel" style={item.kind === 'CORRECTION' ? { '--fam': 'var(--gold)' } : undefined}>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="badge">{KIND_LABELS[item.kind]}</span>
                                {item.aboutType && <span className="badge">{item.aboutType.toLowerCase()} · {item.aboutRef}</span>}
                                <span className="mono text-xs muted ml-auto">{DATE.format(new Date(item.createdAt))}</span>
                            </div>
                            <p className="soft whitespace-pre-line break-words mt-0 mb-3">{item.message}</p>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="muted">
                                    {item.username ? `@${item.username}` : 'Guest'}
                                    {item.email && <> · <a className="link" href={`mailto:${item.email}`}>{item.email}</a></>}
                                </span>
                                {item.pageUrl && <Link className="link mono text-xs" to={item.pageUrl}>Open the page →</Link>}
                                <label className="ml-auto flex items-center gap-2">
                                    <span className="field-label m-0">Status</span>
                                    <select className="field w-auto py-1" value={item.status} disabled={saving === item.id}
                                        onChange={(e) => changeStatus(item, e.target.value)}>
                                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </label>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default AdminFeedback
