import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchGenreContent, saveGenreContent } from '../api/backend.js'
import { data } from '../map/data/types'
import { reloadContentLater } from '../map/data/content'
import AdminTabs from '../components/AdminTabs'
import usePageMeta from '../hooks/usePageMeta.js'

const GENRES = [...data.genres].sort((a, b) => a.name.localeCompare(b.name))

// The drop as the form shows it ("3:32") and as it is saved (212 seconds)
const dropText = (seconds) => seconds == null ? '' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
function dropSeconds(text) {
    const t = text.trim()
    if (!t) return null
    const m = t.match(/^(\d+)(?::(\d{1,2}))?$/)
    if (!m) return undefined
    return m[2] === undefined ? Number(m[1]) : Number(m[1]) * 60 + Number(m[2])
}

const emptyTrack = () => ({ artist: '', title: '', year: '', youtube: '', famous: false, verified: false, drop: '' })
// The form keeps numbers as text, so a half-typed value can be shown
const toForm = (c) => ({
    ...c,
    bass: c.bass ?? '', kick: c.kick ?? '', atmosphere: c.atmosphere ?? '',
    year: c.year ?? '', bpmMin: c.bpmMin ?? '', bpmMax: c.bpmMax ?? '',
    tracks: c.tracks.map(t => ({ ...t, youtube: t.youtube ?? '', year: t.year ?? '', drop: dropText(t.drop) })),
})
const number = (v) => (String(v).trim() === '' ? null : Number(v))

// One key track: its fields in a card, with up, down and remove
function TrackCard({ track, index, count, onChange, onMove, onRemove }) {
    const set = (field) => (e) => onChange({ ...track, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
    const id = (field) => `track-${index}-${field}`
    return (
        <li className="stage-card grid gap-3">
            <div className="flex items-center gap-2">
                <span className="mono text-xs muted">#{index + 1}</span>
                <span className="ml-auto flex gap-1">
                    <button type="button" className="btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">↑</button>
                    <button type="button" className="btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">↓</button>
                    <button type="button" className="btn btn--danger" onClick={onRemove} aria-label="Remove this track">✕</button>
                </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="field-label" htmlFor={id('artist')}>Artist</label>
                    <input id={id('artist')} className="field" value={track.artist} onChange={set('artist')} />
                </div>
                <div>
                    <label className="field-label" htmlFor={id('title')}>Title</label>
                    <input id={id('title')} className="field" value={track.title} onChange={set('title')} />
                </div>
                <div>
                    <label className="field-label" htmlFor={id('youtube')}>YouTube link or id</label>
                    <input id={id('youtube')} className="field" value={track.youtube} onChange={set('youtube')}
                        placeholder="https://www.youtube.com/watch?v=… (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="field-label" htmlFor={id('year')}>Year</label>
                        <input id={id('year')} className="field" inputMode="numeric" value={track.year} onChange={set('year')} />
                    </div>
                    <div>
                        <label className="field-label" htmlFor={id('drop')}>Drop at</label>
                        <input id={id('drop')} className="field" inputMode="numeric" value={track.drop} onChange={set('drop')}
                            placeholder="3:32" />
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 mono text-xs">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={track.verified} onChange={set('verified')} /> Verified</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={track.famous} onChange={set('famous')} /> Famous (easy quiz)</label>
                {track.youtube && (
                    <a className="link" href={`https://www.youtube.com/watch?v=${track.youtube}`} target="_blank" rel="noopener noreferrer">Listen ↗</a>
                )}
            </div>
        </li>
    )
}

// One genre's form; a new one (key) for every genre, so nothing of the last genre is left in it.
// dirtyRef: tells the page whether leaving it would lose changes.
function GenreEditor({ genreId, dirtyRef }) {
    const [form, setForm] = useState(null)
    const [loaded, setLoaded] = useState(null)
    const [state, setState] = useState({ saving: false, error: '', saved: false })

    useEffect(() => {
        let cancelled = false
        fetchGenreContent(genreId)
            .then(c => { if (!cancelled) { setForm(toForm(c)); setLoaded(JSON.stringify(toForm(c))) } })
            .catch(err => !cancelled && setState(s => ({ ...s, error: err.response?.data?.message || 'Could not load this genre.' })))
        return () => { cancelled = true }
    }, [genreId])

    const dirty = Boolean(form) && JSON.stringify(form) !== loaded
    useEffect(() => { dirtyRef.current = dirty }, [dirty, dirtyRef])
    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    const setTrack = (i, track) => setForm(f => ({ ...f, tracks: f.tracks.map((t, j) => (j === i ? track : t)) }))
    const moveTrack = (i, by) => setForm(f => {
        const tracks = [...f.tracks]
        const [t] = tracks.splice(i, 1)
        tracks.splice(i + by, 0, t)
        return { ...f, tracks }
    })
    const removeTrack = (i) => setForm(f => ({ ...f, tracks: f.tracks.filter((_, j) => j !== i) }))

    async function save(e) {
        e.preventDefault()
        const bad = form.tracks.findIndex(t => dropSeconds(t.drop) === undefined)
        if (bad >= 0) {
            setState({ saving: false, saved: false, error: `Track #${bad + 1}: write the drop as minutes:seconds, e.g. 3:32` })
            return
        }
        setState({ saving: true, error: '', saved: false })
        try {
            const saved = await saveGenreContent(genreId, {
                description: form.description, bass: form.bass, kick: form.kick, atmosphere: form.atmosphere,
                year: number(form.year), bpmMin: number(form.bpmMin), bpmMax: number(form.bpmMax), verified: form.verified,
                tracks: form.tracks.map(t => ({ ...t, year: number(t.year), drop: dropSeconds(t.drop) })),
            })
            setForm(toForm(saved))
            setLoaded(JSON.stringify(toForm(saved)))
            // The galaxy loads the new content the next time it opens
            reloadContentLater()
            setState({ saving: false, error: '', saved: true })
        } catch (err) {
            setState({ saving: false, saved: false, error: err.response?.data?.message || 'Could not save. Try again.' })
        }
    }

    return (
        <>
            {state.error && <p className="notice mb-4">{state.error}</p>}
            {!form ? (!state.error && <p className="muted">Loading…</p>) : (
                <form onSubmit={save} className="grid gap-6">
                    <section className="panel grid gap-4">
                        <h2 className="panel__label">Texts</h2>
                        <div>
                            <label className="field-label" htmlFor="galaxy-description">Description</label>
                            <textarea id="galaxy-description" className="field" rows={5} value={form.description} onChange={set('description')} />
                        </div>
                        {['bass', 'kick', 'atmosphere'].map(f => (
                            <div key={f}>
                                <label className="field-label" htmlFor={`galaxy-${f}`}>{f}</label>
                                <input id={`galaxy-${f}`} className="field" value={form[f]} onChange={set(f)} />
                            </div>
                        ))}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="field-label" htmlFor="galaxy-year">Since</label>
                                <input id="galaxy-year" className="field" inputMode="numeric" value={form.year} onChange={set('year')} />
                            </div>
                            <div>
                                <label className="field-label" htmlFor="galaxy-bpm-min">BPM from</label>
                                <input id="galaxy-bpm-min" className="field" inputMode="numeric" value={form.bpmMin} onChange={set('bpmMin')} />
                            </div>
                            <div>
                                <label className="field-label" htmlFor="galaxy-bpm-max">BPM to</label>
                                <input id="galaxy-bpm-max" className="field" inputMode="numeric" value={form.bpmMax} onChange={set('bpmMax')} />
                            </div>
                        </div>
                        <label className="inline-flex items-center gap-2 mono text-xs">
                            <input type="checkbox" checked={form.verified} onChange={set('verified')} /> The texts are verified
                        </label>
                    </section>

                    <section className="panel grid gap-4">
                        <h2 className="panel__label">Key tracks · {form.tracks.length}</h2>
                        <p className="muted text-sm m-0">The first ones show first on the galaxy. "Drop at" lets the quiz start just before the drop.</p>
                        <ol className="grid gap-3 list-none p-0 m-0">
                            {form.tracks.map((t, i) => (
                                <TrackCard key={i} track={t} index={i} count={form.tracks.length}
                                    onChange={(track) => setTrack(i, track)} onMove={(by) => moveTrack(i, by)} onRemove={() => removeTrack(i)} />
                            ))}
                        </ol>
                        <div>
                            <button type="button" className="btn" onClick={() => setForm(f => ({ ...f, tracks: [...f.tracks, emptyTrack()] }))}>
                                + Add track
                            </button>
                        </div>
                    </section>

                    <div className="galaxy-save flex flex-wrap items-center gap-3">
                        <button type="submit" className="btn btn--primary" disabled={state.saving || !dirty}>
                            {state.saving ? 'Saving…' : 'Save'}
                        </button>
                        {dirty && <span className="mono text-xs muted">Not saved yet</span>}
                        {state.saved && !dirty && <span className="mono text-xs" style={{ color: 'var(--accent)' }}>Saved. It is on the galaxy now.</span>}
                    </div>
                </form>
            )}
        </>
    )
}

// Admin -> Galaxy: what the galaxy says about a genre (texts, tempo, key tracks), fixed without a deploy.
// Saving sends the whole genre; the change is in the history and can be undone there.
function AdminGalaxy() {
    usePageMeta({ title: 'Galaxy · Admin', path: '/admin/galaxy', noindex: true })
    const [params, setParams] = useSearchParams()
    const genreId = data.genres.some(g => g.id === params.get('genre')) ? params.get('genre') : GENRES[0].id
    const dirtyRef = useRef(false)

    const pick = (id) => {
        if (dirtyRef.current && !window.confirm('Leave this genre without saving?')) return
        setParams({ genre: id })
    }

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · galaxy</div>
                <h1 className="page-title">Galaxy texts and tracks</h1>
                <p className="page-head__sub">
                    What the galaxy says about each genre. Saved changes are on the map at once and can be undone in History.
                    Mark something verified only when someone who knows the music checked it.
                </p>
            </header>
            <AdminTabs />

            <div className="panel mb-6">
                <label className="field-label" htmlFor="galaxy-genre">Genre</label>
                <div className="flex flex-wrap gap-2 items-center">
                    <select id="galaxy-genre" className="field max-w-xs" value={genreId} onChange={(e) => pick(e.target.value)}>
                        {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <Link className="link mono text-xs" to={`/?genre=${genreId}`}>See it on the galaxy →</Link>
                </div>
            </div>

            <GenreEditor key={genreId} genreId={genreId} dirtyRef={dirtyRef} />
        </div>
    )
}

export default AdminGalaxy
