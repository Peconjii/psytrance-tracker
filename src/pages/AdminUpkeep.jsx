import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    checkDeadTracks, fetchDeadTracks, fetchDuplicateArtists, mergeArtists, setArtistHidden,
} from '../api/backend.js'
import usePageMeta from '../hooks/usePageMeta.js'
import AdminTabs from '../components/AdminTabs'
import { data } from '../map/data/types'

const GENRE_NAMES = Object.fromEntries(data.genres.map(g => [g.id, g.name]))
const errorOf = (err, fallback) => err.response?.data?.message || fallback

// Admin -> Upkeep: the lists that keep the map in order without waiting for someone to report a problem.
// Dead key-track videos (checked by the server once a day) and artists from the line-ups that are probably one person
// written two ways. Events without a genre are the harbour in Admin -> Events.
function AdminUpkeep() {
    usePageMeta({ title: 'Upkeep', path: '/admin/upkeep', noindex: true })
    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · ship maintenance</div>
                <h1 className="page-title">Upkeep</h1>
                <p className="page-head__sub">What needs a look, found before anyone reports it.</p>
            </header>
            <AdminTabs />
            <div className="grid gap-6">
                <DeadTracks />
                <DuplicateArtists />
            </div>
        </div>
    )
}

function DeadTracks() {
    const [state, setState] = useState({ loading: true, result: null, error: '' })
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetchDeadTracks(controller.signal)
            .then(result => setState({ loading: false, result, error: '' }))
            .catch(err => { if (!controller.signal.aborted) setState({ loading: false, result: null, error: errorOf(err, 'Could not load.') }) })
        return () => controller.abort()
    }, [])

    const check = async () => {
        setChecking(true)
        try {
            setState({ loading: false, result: await checkDeadTracks(), error: '' })
        } catch (err) {
            setState(s => ({ ...s, error: errorOf(err, 'The check failed. Try again.') }))
        } finally {
            setChecking(false)
        }
    }

    const { result } = state
    return (
        <section className="panel">
            <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="panel__label m-0">Key tracks that don&apos;t play{result ? ` · ${result.tracks.length}` : ''}</h2>
                <button type="button" className="btn btn--ghost ml-auto" onClick={check} disabled={checking}>
                    {checking ? 'Checking… (about a minute)' : '↻ Check now'}
                </button>
            </div>
            <p className="mono text-xs muted mt-0">
                {result
                    ? `Checked ${result.checked} YouTube videos · ${new Date(result.checkedAt).toLocaleString()}. The server checks again every day.`
                    : state.loading ? 'Loading…' : 'Not checked yet since the server started: it checks within the hour, or press Check now.'}
            </p>
            {state.error && <p className="notice">{state.error}</p>}
            {result && result.tracks.length === 0 && <p className="soft m-0">✓ Every key track plays.</p>}
            {result && result.tracks.length > 0 && (
                <ul className="rows">
                    {result.tracks.map(t => (
                        <li key={`${t.genreId}-${t.youtube}`} className="rows__item">
                            <span className="rows__name">
                                <b>{t.artist}</b> – {t.title} <span className="muted">· {GENRE_NAMES[t.genreId] ?? t.genreId}</span>
                            </span>
                            <span className="flex items-center gap-3 mono text-xs">
                                <span style={{ color: 'var(--danger)' }}>{t.problem}</span>
                                <a className="link" href={`https://www.youtube.com/watch?v=${t.youtube}`} target="_blank" rel="noopener noreferrer">Open ↗</a>
                                <Link className="link" to={`/admin/galaxy?genre=${t.genreId}`}>Fix →</Link>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

function DuplicateArtists() {
    const [state, setState] = useState({ loading: true, groups: [], error: '' })
    const [busy, setBusy] = useState(null)
    useEffect(() => {
        const controller = new AbortController()
        fetchDuplicateArtists(controller.signal)
            .then(groups => setState({ loading: false, groups, error: '' }))
            .catch(err => { if (!controller.signal.aborted) setState({ loading: false, groups: [], error: errorOf(err, 'Could not load.') }) })
        return () => controller.abort()
    }, [])

    // Merges every other name of the group into the one picked; merges can't be undone, so it asks first
    const keep = async (group, into) => {
        const others = group.names.filter(n => n !== into)
        if (!window.confirm(`Merge ${others.join(', ')} into "${into}"? Their events become ${into}'s. This can't be undone.`)) return
        setBusy(group.key)
        try {
            for (const from of others) await mergeArtists(from, into)
            setState(s => ({ ...s, groups: s.groups.filter(g => g.key !== group.key), error: '' }))
        } catch (err) {
            setState(s => ({ ...s, error: errorOf(err, 'Could not merge.') }))
        } finally {
            setBusy(null)
        }
    }

    // Stage names and notes the line-up parser took for artists ("Main Floor", "More TBA"): hidden, not merged
    const hideAll = async (group) => {
        if (!window.confirm(`Hide ${group.names.join(', ')}? They stop counting as artists (Admin -> History can undo it).`)) return
        setBusy(group.key)
        try {
            for (const name of group.names) await setArtistHidden(name, true)
            setState(s => ({ ...s, groups: s.groups.filter(g => g.key !== group.key), error: '' }))
        } catch (err) {
            setState(s => ({ ...s, error: errorOf(err, 'Could not hide them.') }))
        } finally {
            setBusy(null)
        }
    }

    return (
        <section className="panel">
            <h2 className="panel__label">Probably the same artist{state.loading ? '' : ` · ${state.groups.length}`}</h2>
            <p className="mono text-xs muted mt-0">
                Names from the line-ups that differ only in brackets, &quot;DJ&quot;, &quot;live&quot; or punctuation. Press the name to keep:
                the others are merged into it. Not the same person? Just leave the row. Not artists at all (a stage name, a note)? ✕ hides them.
            </p>
            {state.error && <p className="notice">{state.error}</p>}
            {state.loading ? <p className="mono text-xs muted">Loading…</p>
                : state.groups.length === 0 ? <p className="soft m-0">✓ No look-alike names.</p>
                : (
                    <ul className="grid gap-2 list-none p-0 m-0">
                        {state.groups.slice(0, 80).map(group => (
                            <li key={group.key} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="mono text-xs muted">keep:</span>
                                {group.names.map(name => (
                                    <button key={name} type="button" className="chip" disabled={busy === group.key}
                                        onClick={() => keep(group, name)} title={`Keep "${name}", merge the others into it`}>{name}</button>
                                ))}
                                <button type="button" className="btn btn--ghost btn--danger ml-auto" disabled={busy === group.key}
                                    onClick={() => hideAll(group)} title="Not artists at all (a stage, a note): hide them">✕ Not artists</button>
                            </li>
                        ))}
                    </ul>
                )}
        </section>
    )
}

export default AdminUpkeep
