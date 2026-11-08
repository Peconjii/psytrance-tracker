import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchGalaxyContent, fetchGenreContent, markAsOrganizer, mergeArtists, saveGenreContent, searchAdminArtists, setArtistGenres, setArtistHidden } from '../api/backend.js'
import { reloadContentLater } from '../map/data/content'
import { genreById } from '../map/data/types'
import { reloadPlacementsLater } from '../map/data/placements'
import AdminTabs from '../components/AdminTabs'
import { AddGenre, FeedbackBanner, GenreChip } from '../components/AdminParts'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

// One artist: their genres, with remove and add. Every change is saved at once and logged on the backend.
function ArtistRow({ artist, onSaved, onGone }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    // Key tracks of theirs left at a star they no longer orbit as their main one, offered to move after a save
    const [strays, setStrays] = useState([])

    const save = async (genres) => {
        setSaving(true)
        setError('')
        setStrays([])
        try {
            const saved = await setArtistGenres(artist.name, genres)
            onSaved(saved)
            if (saved.genres[0] && (saved.genres[0] !== artist.genres[0] || artist.genres.some(g => !saved.genres.includes(g)))) {
                findStrays(artist.name, saved.genres).then(setStrays).catch(() => {})
            }
            // The galaxy loads the new placements the next time it opens
            reloadPlacementsLater()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setSaving(false)
        }
    }

    const firstGenre = artist.genres[0]
    return (
        <li className="rows__item admin-artist">
            <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{artist.name}</span>
                <span className="badge">{artist.onMap ? 'On the map' : 'Only in line-ups'}</span>
                <span className="ml-auto flex gap-3 mono text-xs">
                    {firstGenre && (
                        <Link className="link" to={`/?genre=${firstGenre}&artist=${encodeURIComponent(artist.name)}`}>On the map →</Link>
                    )}
                    <Link className="link" to={`/artists/${encodeURIComponent(artist.slug)}`} state={{ name: artist.name }}>Page →</Link>
                    <Link className="link" to={`/artists/${encodeURIComponent(artist.slug)}/edit`}>Edit profile →</Link>
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {artist.genres.length === 0 && <span className="muted text-sm">No genre: not on the map</span>}
                {artist.genres.map((id, i) => (
                    <GenreChip key={id} id={id} disabled={saving} title={i === 0 ? 'Main genre: the star they orbit on the galaxy' : undefined}
                        onRemove={() => save(artist.genres.filter(g => g !== id))}>
                        {i === 0 ? <span className="mono text-xs">★ star</span> : (
                            <button type="button" className="bg-transparent border-0 p-0 cursor-pointer mono text-xs muted" disabled={saving}
                                onClick={() => save([id, ...artist.genres.filter(g => g !== id)])}
                                title="Make this the star they orbit on the galaxy">☆ make star</button>
                        )}
                    </GenreChip>
                ))}
                <AddGenre exclude={artist.genres} disabled={saving} label={`Add a genre to ${artist.name}`}
                    onAdd={(id) => save([...artist.genres, id])} />
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {strays.length > 0 && <MoveTracks artist={artist.name} strays={strays} onDone={() => setStrays([])} />}
            {!artist.onMap && <CleanupTools artist={artist} onGone={onGone} />}
            {error && <p className="notice m-0">{error}</p>}
        </li>
    )
}

// Is the artist one of the names on this key track ("A & B", "A vs B", "A feat. B" count for both)?
const onTrack = (name, track) => [track.artist, ...track.artist.split(/ & |, | x | vs\.? | ft\.? | feat\.? /i)]
    .some(part => part.trim().toLowerCase() === name.trim().toLowerCase())

// After the artist's genres changed: their key tracks that sit at a star they don't orbit any more, or at their old
// main star while the new one has none of theirs. Each is offered to move to the new main star.
async function findStrays(name, genres) {
    const content = await fetchGalaxyContent()
    const main = genres[0]
    const atMain = (content[main]?.tracks ?? []).some(t => onTrack(name, t))
    const strays = []
    for (const [genreId, c] of Object.entries(content)) {
        if (genreId === main) continue
        const theirs = (c.tracks ?? []).filter(t => onTrack(name, t))
        if (theirs.length === 0) continue
        if (!genres.includes(genreId) || !atMain) {
            for (const t of theirs) strays.push({ from: genreId, to: main, track: t })
        }
    }
    return strays
}

// "Move it": the key track leaves the old star and joins the end of the new star's list (both saved, both in History)
function MoveTracks({ artist, strays, onDone }) {
    const [busy, setBusy] = useState(null)
    const [error, setError] = useState('')
    const [left, setLeft] = useState(strays)
    const name = (id) => genreById[id]?.name ?? id

    const move = async (stray) => {
        setBusy(stray)
        setError('')
        try {
            const [from, to] = await Promise.all([fetchGenreContent(stray.from), fetchGenreContent(stray.to)])
            const same = (t) => t.title === stray.track.title && t.artist === stray.track.artist
            const moving = from.tracks.find(same)
            if (moving && !to.tracks.some(same)) {
                await saveGenreContent(stray.to, { ...to, tracks: [...to.tracks, moving] })
            }
            if (moving) await saveGenreContent(stray.from, { ...from, tracks: from.tracks.filter(t => !same(t)) })
            reloadContentLater()
            const rest = left.filter(s => s !== stray)
            setLeft(rest)
            if (rest.length === 0) onDone()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not move it. Try again.')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="grid gap-2 text-sm" style={{ borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
            {left.map(s => (
                <div key={s.from + s.track.title} className="flex flex-wrap items-center gap-2">
                    <span className="soft">Key track <b>{s.track.artist} – {s.track.title}</b> is at {name(s.from)}.</span>
                    <button type="button" className="btn" disabled={busy !== null} onClick={() => move(s)}>
                        {busy === s ? 'Moving…' : `Move it to ${name(s.to)}`}
                    </button>
                </div>
            ))}
            <div className="flex items-center gap-3">
                <button type="button" className="link mono text-xs bg-transparent border-0 p-0 cursor-pointer" onClick={onDone}>Keep them where they are</button>
                {error && <span className="mono text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
            </div>
            <p className="mono text-xs muted m-0">Artist: {artist}. Both stars&apos; key tracks change; each is in History with undo.</p>
        </div>
    )
}

// Names compared the way the backend's slugs do: no case, accents or symbols
const nameKey = (name) => (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

// An artist the site doesn't know yet (no line-up, not on the map), e.g. one just given a key track in Galaxy:
// picking a genre puts them on the map, orbiting that star.
function NewArtistRow({ name, onSaved }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const add = async (id) => {
        setSaving(true)
        setError('')
        try {
            onSaved(await setArtistGenres(name, [id]))
            reloadPlacementsLater()
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setSaving(false)
        }
    }
    return (
        <li className="rows__item admin-artist">
            <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{name}</span>
                <span className="badge">New: not on the site yet</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="muted text-sm">Put them on the map: pick the star they orbit</span>
                <AddGenre exclude={[]} disabled={saving} label={`Add a genre to ${name}`} onAdd={add} />
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {error && <p className="notice m-0">{error}</p>}
        </li>
    )
}

// For words found in line-ups: "not an artist" (skipped from now on, undo in the history) or a merge into
// the artist's other spelling (can't be undone). Either way the row leaves the list.
function CleanupTools({ artist, onGone }) {
    const [merging, setMerging] = useState(false)
    const [into, setInto] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const run = async (action, message) => {
        setBusy(true)
        setError('')
        try {
            await action()
            onGone(artist.slug, message)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn--ghost" disabled={busy}
                onClick={() => run(() => setArtistHidden(artist.name, true), `${artist.name} is hidden: not an artist. Undo it in the history.`)}>
                Not an artist
            </button>
            <button className="btn btn--ghost" disabled={busy}
                onClick={() => run(() => markAsOrganizer(artist.name), `${artist.name} is an organizer now: hidden from the artists, with an organizer page.`)}>
                This is an organizer
            </button>
            {merging ? (
                <>
                    <input className="field w-auto" value={into} onChange={(e) => setInto(e.target.value)} autoFocus
                        placeholder="The right spelling" aria-label={`Merge ${artist.name} into`} />
                    <button className="btn" disabled={busy || !into.trim()}
                        onClick={() => window.confirm(`Merge "${artist.name}" into "${into.trim()}"? This can't be undone.`)
                            && run(() => mergeArtists(artist.name, into.trim()), `${artist.name} is merged into ${into.trim()}.`)}>
                        Merge
                    </button>
                    <button className="btn btn--ghost" disabled={busy} onClick={() => setMerging(false)}>Cancel</button>
                </>
            ) : (
                <button className="btn btn--ghost" disabled={busy} onClick={() => setMerging(true)}>Merge into…</button>
            )}
            {error && <span className="notice m-0">{error}</span>}
        </div>
    )
}

// Admin panel: find an artist (on the map or from the line-ups) and place them in the right genres.
// Opened from the feedback inbox as /admin/genres?artist=Fungus%20Funk
function AdminGenres() {
    usePageMeta({ title: 'Artist genres', path: '/admin/genres', noindex: true })
    const [params] = useSearchParams()
    const [search, setSearch] = useState(params.get('artist') || '')
    const debounced = useDebouncedValue(search.trim(), 300)
    // Tagged with the search it answers, so a slow old answer never replaces a newer one
    const [result, setResult] = useState({ search: null, artists: [], error: null })
    // Opened from a feedback message (?feedback=7): once something is saved, offer to close the message
    const feedbackId = params.get('feedback')
    const [fixed, setFixed] = useState(false)
    const [note, setNote] = useState('')

    useEffect(() => {
        if (debounced.length < 2) return
        const controller = new AbortController()
        searchAdminArtists(debounced, controller.signal)
            .then(artists => setResult({ search: debounced, artists, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) {
                    setResult({ search: debounced, artists: [], error: err.response?.data?.message || 'Could not search.' })
                }
            })
        return () => controller.abort()
    }, [debounced])

    const replace = (updated) => {
        setFixed(true)
        setResult(prev => ({
            ...prev,
            artists: prev.artists.map(a => (a.slug === updated.slug ? updated : a)),
        }))
    }

    // Hidden or merged: the row leaves the list, with a note of what happened
    const remove = (slug, message) => {
        setFixed(true)
        setNote(message)
        setResult(prev => ({ ...prev, artists: prev.artists.filter(a => a.slug !== slug) }))
    }

    return (
        <div className="page">
            <header className="page-head">
                <div className="page-head__tag">// Admin · star charts</div>
                <h1 className="page-title">Artist genres</h1>
                <p className="page-head__sub">
                    Place an artist in the genres they play. Changes apply at once: the map, and the genres of the
                    events they play, which are worked out again within a few minutes.
                 The first genre (★ star) is the one star they orbit on the galaxy; the others count for ships, filters and the profile.</p>
            </header>
            <AdminTabs />

            {feedbackId && <FeedbackBanner feedbackId={feedbackId} fixed={fixed} />}

            <div className="panel mb-6">
                <label htmlFor="admin-artist-search" className="field-label">Artist</label>
                <input id="admin-artist-search" type="text" className="field" value={search} autoFocus
                    placeholder="Fungus Funk, Ajja..." onChange={(e) => setSearch(e.target.value)} />
            </div>

            {note && <p className="panel mb-4" role="status">{note}</p>}

            {debounced.length < 2 ? (
                <p className="muted">Type at least two letters.</p>
            ) : result.search !== debounced ? (
                <p className="mono text-xs muted">Searching…</p>
            ) : result.error ? (
                <p className="notice">{result.error}</p>
            ) : (
                <>
                    {result.artists.length === 0 && (
                        <p className="muted mb-3">No artist with that name on the map or in the line-ups yet.</p>
                    )}
                    <ul className="rows">
                        {result.artists.map(artist => <ArtistRow key={artist.slug} artist={artist} onSaved={replace} onGone={remove} />)}
                        {!result.artists.some(a => nameKey(a.name) === nameKey(debounced)) && (
                            <NewArtistRow key={nameKey(debounced)} name={debounced.trim()}
                                onSaved={(added) => { setFixed(true); setResult(prev => ({ ...prev, artists: [...prev.artists, added] })) }} />
                        )}
                    </ul>
                </>
            )}
        </div>
    )
}

export default AdminGenres
