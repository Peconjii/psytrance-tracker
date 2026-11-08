import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchGenreContent, fetchPlacements, saveGenreContent, searchAdminArtists, setArtistGenres } from '../api/backend.js'
import { reloadPlacementsLater } from '../map/data/placements'
import { data } from '../map/data/types'
import { reloadContentLater } from '../map/data/content'
import AdminTabs from '../components/AdminTabs'
import AddedGenreForm from '../components/AddedGenreForm'
import { addedGenres, loadAddedGenres } from '../map/data/addedGenres'
import usePageMeta from '../hooks/usePageMeta.js'


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

// Names compared the way the backend's slugs do: no case, accents or symbols
const nameKey = (name) => (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const artistsOf = (tracks) => {
    const byKey = new Map()
    for (const t of tracks) if (nameKey(t.artist)) byKey.set(nameKey(t.artist), t.artist.trim())
    return byKey
}

// The key tracks and the orbit are two lists: a track's artist doesn't orbit the star by itself. This asks
// about the artists the two lists disagree on: a track but no orbit (add?), and the last track just removed (remove?).
function OrbitCheck({ genreId, tracksJson, removedArtists }) {
    const tracks = tracksJson ? JSON.parse(tracksJson).tracks : []
    const [orbit, setOrbit] = useState(null)
    const [done, setDone] = useState({})
    const [busy, setBusy] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        fetchPlacements()
            .then(p => { if (!cancelled) setOrbit(new Set((p[genreId] ?? []).map(nameKey))) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [genreId, tracksJson])

    if (!orbit) return null
    const toAdd = [...artistsOf(tracks)].filter(([key]) => !orbit.has(key)).map(([, name]) => name)
    const toRemove = removedArtists.filter(name => orbit.has(nameKey(name)) && !artistsOf(tracks).has(nameKey(name)))
    if (toAdd.length === 0 && toRemove.length === 0) return null

    async function change(name, add) {
        setBusy(name)
        setError('')
        try {
            const found = await searchAdminArtists(name)
            const genres = found.find(a => nameKey(a.name) === nameKey(name))?.genres ?? []
            await setArtistGenres(name, add ? [...genres.filter(g => g !== genreId), genreId] : genres.filter(g => g !== genreId))
            reloadPlacementsLater()
            setDone(d => ({ ...d, [name]: add ? 'Added to the orbit' : 'Removed from the orbit' }))
        } catch (err) {
            setError(err.response?.data?.message || `Could not change ${name}. Try again.`)
        } finally {
            setBusy(null)
        }
    }

    const row = (name, add) => (
        <li key={(add ? '+' : '-') + name} className="rows__item flex flex-wrap items-center gap-3">
            <span className="font-medium">{name}</span>
            <span className="mono text-xs muted">{add ? 'has a key track here, but doesn’t orbit this star' : 'no key track here any more, still orbits this star'}</span>
            {done[name] ? <span className="mono text-xs ml-auto" style={{ color: 'var(--accent)' }}>{done[name]}</span> : (
                <button type="button" className={'btn ml-auto' + (add ? '' : ' btn--danger')} disabled={busy !== null} aria-busy={busy === name}
                    onClick={() => change(name, add)}>
                    {busy === name ? 'Saving…' : add ? 'Add to the orbit' : 'Remove from the orbit'}
                </button>
            )}
        </li>
    )
    return (
        <section className="panel grid gap-3">
            <h2 className="panel__label">Orbit of this star</h2>
            <p className="mono text-xs muted m-0">Key tracks and the artists orbiting the star are separate lists. Every change here is in History, with undo.</p>
            {error && <p className="notice m-0">{error}</p>}
            <ul className="rows">
                {toAdd.map(name => row(name, true))}
                {toRemove.map(name => row(name, false))}
            </ul>
        </section>
    )
}

// One genre's form; a new one (key) for every genre, so nothing of the last genre is left in it.
// dirtyRef: tells the page whether leaving it would lose changes.
function GenreEditor({ genreId, dirtyRef }) {
    const [form, setForm] = useState(null)
    const [loaded, setLoaded] = useState(null)
    const [state, setState] = useState({ saving: false, error: '', saved: false })
    // Artists whose last key track here went away with the last save
    const [removedArtists, setRemovedArtists] = useState([])

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
            const after = artistsOf(saved.tracks)
            setRemovedArtists([...artistsOf(JSON.parse(loaded).tracks)].filter(([key]) => !after.has(key)).map(([, name]) => name))
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

                    <OrbitCheck genreId={genreId} tracksJson={loaded} removedArtists={removedArtists} />

                    <div className="galaxy-save flex flex-wrap items-center gap-3">
                        <button type="submit" className="btn btn--primary" disabled={state.saving || !dirty}>
                            {state.saving ? 'Saving…' : 'Save'}
                        </button>
                        {dirty && <span className="mono text-xs muted">Not saved yet</span>}
                        {/* The reason a save failed, next to the button: the notice at the top is off screen down here */}
                        {state.error && <span className="mono text-xs" role="alert" style={{ color: 'var(--danger, #ff6b6b)' }}>{state.error}</span>}
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
    // The genres admins added join once loaded; the list is read on every render
    const [, setVersion] = useState(0)
    useEffect(() => { loadAddedGenres().then(() => setVersion(v => v + 1)) }, [])
    const genres = [...data.genres].sort((a, b) => a.name.localeCompare(b.name))
    const genreId = data.genres.some(g => g.id === params.get('genre')) ? params.get('genre') : genres[0].id
    const added = addedGenres.find(g => g.id === genreId)
    const [adding, setAdding] = useState(false)
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
                        {genres.map(g => <option key={g.id} value={g.id}>{g.name}{addedGenres.some(a => a.id === g.id) ? ' · added' : ''}</option>)}
                    </select>
                    <Link className="link mono text-xs" to={`/?genre=${genreId}`}>See it on the galaxy →</Link>
                    {!adding && <button type="button" className="btn ml-auto" onClick={() => setAdding(true)}>+ New genre</button>}
                </div>
            </div>

            {adding && (
                <AddedGenreForm onCancel={() => setAdding(false)}
                    onSaved={(g) => { setAdding(false); setParams({ genre: g.id }) }} onRemoved={() => setAdding(false)} />
            )}
            {!adding && added && (
                <AddedGenreForm key={added.id + added.x + added.y + added.name} genre={added}
                    onSaved={() => setVersion(v => v + 1)} onRemoved={() => setParams({})} />
            )}

            <GenreEditor key={genreId} genreId={genreId} dirtyRef={dirtyRef} />
        </div>
    )
}

export default AdminGalaxy
