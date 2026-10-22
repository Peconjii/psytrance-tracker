import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mergeArtists, searchAdminArtists, setArtistGenres, setArtistHidden } from '../api/backend.js'
import { reloadPlacementsLater } from '../map/data/placements'
import AdminTabs from '../components/AdminTabs'
import { AddGenre, FeedbackBanner, GenreChip } from '../components/AdminParts'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

// One artist: their genres, with remove and add. Every change is saved at once and logged on the backend.
function ArtistRow({ artist, onSaved, onGone }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const save = async (genres) => {
        setSaving(true)
        setError('')
        try {
            onSaved(await setArtistGenres(artist.name, genres))
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
                {artist.genres.map(id => (
                    <GenreChip key={id} id={id} disabled={saving}
                        onRemove={() => save(artist.genres.filter(g => g !== id))} />
                ))}
                <AddGenre exclude={artist.genres} disabled={saving} label={`Add a genre to ${artist.name}`}
                    onAdd={(id) => save([...artist.genres, id])} />
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {!artist.onMap && <CleanupTools artist={artist} onGone={onGone} />}
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
                </p>
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
            ) : result.artists.length === 0 ? (
                <div className="empty"><p><strong>No artist with that name on the map or in the line-ups.</strong></p></div>
            ) : (
                <ul className="rows">
                    {result.artists.map(artist => <ArtistRow key={artist.slug} artist={artist} onSaved={replace} onGone={remove} />)}
                </ul>
            )}
        </div>
    )
}

export default AdminGenres
