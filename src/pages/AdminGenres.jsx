import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { searchAdminArtists, setArtistGenres, setFeedbackStatus } from '../api/backend.js'
import { data, genreById } from '../map/data/types'
import { reloadPlacementsLater } from '../map/data/placements'
import AdminTabs from '../components/AdminTabs'
import useDebouncedValue from '../hooks/useDebouncedValue.js'
import usePageMeta from '../hooks/usePageMeta.js'

// Genres grouped by scene, for the "add genre" picker
const SCENES = Object.entries(data.families).map(([id, family]) => ({
    name: family.name,
    genres: data.genres.filter(g => g.family === id),
}))

function GenreChip({ id, onRemove, disabled }) {
    const genre = genreById[id]
    const color = genre ? data.families[genre.family].color : 'var(--muted)'
    return (
        <span className="genre-chip inline-flex items-center gap-2" style={{ '--c': color }}>
            {genre?.name ?? id}
            <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${genre?.name ?? id}`}
                className="bg-transparent border-0 p-0 cursor-pointer" style={{ color }}>✕</button>
        </span>
    )
}

// One artist: their genres, with remove and add. Every change is saved at once and logged on the backend.
function ArtistRow({ artist, onSaved }) {
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
                    <Link className="link" to={`/artists/${encodeURIComponent(artist.slug)}`} state={{ name: artist.name }}>Gigs →</Link>
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {artist.genres.length === 0 && <span className="muted text-sm">No genre: not on the map</span>}
                {artist.genres.map(id => (
                    <GenreChip key={id} id={id} disabled={saving}
                        onRemove={() => save(artist.genres.filter(g => g !== id))} />
                ))}
                <select className="field admin-artist__add" value="" disabled={saving} aria-label={`Add a genre to ${artist.name}`}
                    onChange={(e) => e.target.value && save([...artist.genres, e.target.value])}>
                    <option value="">+ Add genre</option>
                    {SCENES.map(scene => (
                        <optgroup key={scene.name} label={scene.name}>
                            {scene.genres.filter(g => !artist.genres.includes(g.id)).map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                {saving && <span className="mono text-xs muted">Saving…</span>}
            </div>
            {error && <p className="notice m-0">{error}</p>}
        </li>
    )
}

// Admin panel: find an artist (on the map or from the line-ups) and place them in the right genres.
// Opened from the feedback inbox as /admin/genres?artist=Fungus%20Funk
function AdminGenres() {
    usePageMeta({ title: 'Artist genres', path: '/admin/genres', noindex: true })
    const { user } = useAuth()
    const [params] = useSearchParams()
    const [search, setSearch] = useState(params.get('artist') || '')
    const debounced = useDebouncedValue(search.trim(), 300)
    // Tagged with the search it answers, so a slow old answer never replaces a newer one
    const [result, setResult] = useState({ search: null, artists: [], error: null })
    // Opened from a feedback message (?feedback=7): once something is saved, offer to close the message
    const feedbackId = params.get('feedback')
    const [fixed, setFixed] = useState(false)
    const [feedbackState, setFeedbackState] = useState('open')

    useEffect(() => {
        if (!user?.admin || debounced.length < 2) return
        const controller = new AbortController()
        searchAdminArtists(debounced, controller.signal)
            .then(artists => setResult({ search: debounced, artists, error: null }))
            .catch(err => {
                if (!controller.signal.aborted) {
                    setResult({ search: debounced, artists: [], error: err.response?.data?.message || 'Could not search.' })
                }
            })
        return () => controller.abort()
    }, [debounced, user?.admin])

    if (!user?.admin) {
        return <div className="page page--narrow"><p className="notice">This page is for admins.</p></div>
    }

    const markDone = async () => {
        setFeedbackState('saving')
        try {
            await setFeedbackStatus(feedbackId, 'DONE')
            setFeedbackState('done')
        } catch {
            setFeedbackState('error')
        }
    }

    const replace = (updated) => {
        setFixed(true)
        setResult(prev => ({
        ...prev,
            artists: prev.artists.map(a => (a.slug === updated.slug ? updated : a)),
        }))
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

            {feedbackId && (
                <div className="panel mb-6" style={{ '--fam': 'var(--gold)' }}>
                    {feedbackState === 'done' ? (
                        <p className="m-0">Feedback #{feedbackId} is marked as done. <Link className="link" to="/admin/feedback">Back to the inbox →</Link></p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <span>{fixed ? 'Saved. Is feedback #' + feedbackId + ' sorted now?' : 'Fixing feedback #' + feedbackId + '.'}</span>
                            {fixed && (
                                <button className="btn btn--primary" onClick={markDone} disabled={feedbackState === 'saving'}>
                                    {feedbackState === 'saving' ? 'Saving…' : 'Mark as done'}
                                </button>
                            )}
                            {feedbackState === 'error' && <span className="notice m-0">Could not change the status. Try again.</span>}
                        </div>
                    )}
                </div>
            )}

            <div className="panel mb-6">
                <label htmlFor="admin-artist-search" className="field-label">Artist</label>
                <input id="admin-artist-search" type="text" className="field" value={search} autoFocus
                    placeholder="Fungus Funk, Ajja..." onChange={(e) => setSearch(e.target.value)} />
            </div>

            {debounced.length < 2 ? (
                <p className="muted">Type at least two letters.</p>
            ) : result.error ? (
                <p className="notice">{result.error}</p>
            ) : result.search !== debounced ? (
                <p className="mono text-xs muted">Searching…</p>
            ) : result.artists.length === 0 ? (
                <div className="empty"><p><strong>No artist with that name on the map or in the line-ups.</strong></p></div>
            ) : (
                <ul className="rows">
                    {result.artists.map(artist => <ArtistRow key={artist.slug} artist={artist} onSaved={replace} />)}
                </ul>
            )}
        </div>
    )
}

export default AdminGenres
