import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    fetchArtistEdit, removeArtistOwner, requestArtistChange, saveArtistFestivals, saveArtistProfile, saveArtistTracks,
    setArtistOwner, setArtistRole,
} from '../api/backend.js'
import { ROLES } from '../components/artistRole.js'
import { AddGenre, GenreChip } from '../components/AdminParts'
import OwnerNumbers from '../components/OwnerNumbers.jsx'
import usePageMeta from '../hooks/usePageMeta.js'
import { genreById } from '../map/data/types'

const PROFILE_FIELDS = [
    { key: 'photoUrl', label: 'Photo', placeholder: 'https://… (a square picture works best)' },
    { key: 'soundcloudUrl', label: 'SoundCloud', placeholder: 'https://soundcloud.com/…' },
    { key: 'bandcampUrl', label: 'Bandcamp', placeholder: 'https://….bandcamp.com' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'websiteUrl', label: 'Website', placeholder: 'https://…' },
    { key: 'bookingEmail', label: 'Booking email', placeholder: 'booking@…', type: 'email' },
]
const MAX_BIO = 1000
const MAX_TRACKS = 6
const MAX_FESTIVALS = 20
const MAX_GENRES = 4

// The message of a failed save: the backend's, or which fields need a fix
function errorOf(err) {
    const data = err.response?.data
    if (data?.errors) return 'Some fields need a fix: ' + Object.keys(data.errors).join(', ')
    return data?.message || 'Could not save. Try again.'
}

// One part of the editor with its own Save button and status
function Part({ label, hint, onSave, saving, status, children }) {
    return (
        <form className="panel mb-4 grid gap-3" onSubmit={(e) => { e.preventDefault(); onSave() }}>
            <div>
                <h2 className="panel__label m-0">{label}</h2>
                {hint && <p className="muted text-sm mt-1 mb-0">{hint}</p>}
            </div>
            {children}
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                {status?.ok && <span className="mono text-xs soft" role="status">{status.ok}</span>}
            </div>
            {status?.error && <p className="notice m-0">{status.error}</p>}
        </form>
    )
}

// Runs a save and keeps its state for one part of the editor
function useSave() {
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState(null)
    const run = async (action, ok = 'Saved.') => {
        setSaving(true)
        setStatus(null)
        try {
            const result = await action()
            setStatus({ ok })
            return result
        } catch (err) {
            setStatus({ error: errorOf(err) })
            return null
        } finally {
            setSaving(false)
        }
    }
    return { saving, status, run }
}

// Editing an artist's profile: by the artist (an account an admin linked to them) or an admin. The profile, tracks
// and festivals save at once; genres and the name go to an admin as requests, since genres move the artist's
// satellite for everyone and the name is how line-ups find them.
function ArtistEdit() {
    const { slug } = useParams()
    const { user } = useAuth()
    const [edit, setEdit] = useState(null)
    const [loadError, setLoadError] = useState('')

    const [profile, setProfile] = useState(null)
    const [tracks, setTracks] = useState([])
    const [festivals, setFestivals] = useState([])
    const [genres, setGenres] = useState([])
    const [name, setName] = useState('')
    const [owner, setOwner] = useState('')
    const [role, setRole] = useState('')

    const profileSave = useSave()
    const tracksSave = useSave()
    const festivalsSave = useSave()
    const genresSave = useSave()
    const nameSave = useSave()
    const ownerSave = useSave()
    const roleSave = useSave()

    usePageMeta({ title: `Edit · ${edit?.name || slug}`, path: `/artists/${slug}/edit`, noindex: true })

    const show = (found) => {
        setEdit(found)
        setProfile(Object.fromEntries(PROFILE_FIELDS.map(f => [f.key, found.profile[f.key] ?? '']).concat([['bio', found.profile.bio ?? '']])))
        setTracks(found.tracks)
        setFestivals(found.festivals.map(f => ({ ...f, year: f.year ?? '', url: f.url ?? '' })))
        setGenres(found.genres)
        setName(found.profile.displayName || found.name)
        setOwner(found.owner || '')
        setRole(found.role || '')
    }

    useEffect(() => {
        const controller = new AbortController()
        fetchArtistEdit(slug, controller.signal)
            .then(show)
            .catch(err => {
                if (controller.signal.aborted) return
                const status = err.response?.status
                setLoadError(status === 403 ? 'Only the artist and admins can edit this profile.'
                    : status === 404 ? 'This artist is not in any line-up yet, so there is no profile to edit.'
                        : err.response?.data?.message || 'Could not load the profile.')
            })
        return () => controller.abort()
    }, [slug])

    const reload = async () => show(await fetchArtistEdit(slug))
    const pending = (kind) => edit?.pendingRequests.find(r => r.kind === kind)
    const isAdmin = user?.admin

    if (loadError) {
        return <div className="page page--narrow"><p className="notice">{loadError}</p></div>
    }
    if (!edit) {
        return <div className="page page--narrow"><p className="mono text-xs muted">Loading…</p></div>
    }

    const trim = (value) => (typeof value === 'string' ? value.trim() : value)
    const changeRow = (setList, i, key, value) => setList(prev => prev.map((row, j) => (j === i ? { ...row, [key]: value } : row)))
    const removeRow = (setList, i) => setList(prev => prev.filter((_, j) => j !== i))

    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Satellite · edit profile</div>
                <h1 className="page-title">{edit.name}</h1>
                <p className="page-head__sub">
                    What you change here shows on <Link className="link" to={`/artists/${slug}`}>the profile</Link> right away.
                    Genres and the name are checked by an admin first.
                </p>
            </header>

            <OwnerNumbers kind="artist" id={slug} />

            <Part label="Profile" saving={profileSave.saving} status={profileSave.status}
                onSave={() => profileSave.run(() => saveArtistProfile(slug, Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, trim(v)]))))}>
                {profile.photoUrl.startsWith('https://') && (
                    <img className="artist-head__photo" src={profile.photoUrl} alt="" referrerPolicy="no-referrer" />
                )}
                {PROFILE_FIELDS.map(field => (
                    <div key={field.key}>
                        <label htmlFor={`profile-${field.key}`} className="field-label">{field.label}</label>
                        <input id={`profile-${field.key}`} type={field.type || 'url'} className="field" value={profile[field.key]}
                            placeholder={field.placeholder} onChange={(e) => setProfile(p => ({ ...p, [field.key]: e.target.value }))} />
                    </div>
                ))}
                <div>
                    <label htmlFor="profile-bio" className="field-label">Bio · {profile.bio.length}/{MAX_BIO}</label>
                    <textarea id="profile-bio" className="field" rows={5} maxLength={MAX_BIO} value={profile.bio}
                        placeholder="A few sentences: where you're from, your sound, your labels…"
                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} />
                </div>
            </Part>

            <Part label="Main role" hint="A label and a filter on the artists page. Every role gets the same profile options."
                saving={roleSave.saving} status={roleSave.status}
                onSave={() => roleSave.run(() => setArtistRole(slug, role || null))}>
                <select className="field" aria-label="Main role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">Let the site guess (Producer with releases on the map, Live act if most line-ups say "live", else DJ)</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
            </Part>

            <Part label={`Tracks · ${tracks.length}/${MAX_TRACKS}`} hint="Links to listen: YouTube, SoundCloud, Bandcamp… In the order they show."
                saving={tracksSave.saving} status={tracksSave.status}
                onSave={() => tracksSave.run(() => saveArtistTracks(slug, tracks.map(t => ({ title: trim(t.title), url: trim(t.url) }))))}>
                {tracks.map((track, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                        <input className="field w-auto flex-1" placeholder="Title" aria-label="Track title" value={track.title}
                            onChange={(e) => changeRow(setTracks, i, 'title', e.target.value)} />
                        <input className="field w-auto flex-1" type="url" placeholder="https://…" aria-label="Link" value={track.url}
                            onChange={(e) => changeRow(setTracks, i, 'url', e.target.value)} />
                        <button type="button" className="btn btn--ghost" onClick={() => removeRow(setTracks, i)} aria-label={`Remove ${track.title || 'this track'}`}>✕</button>
                    </div>
                ))}
                {tracks.length < MAX_TRACKS && (
                    <button type="button" className="btn w-fit" onClick={() => setTracks(prev => [...prev, { title: '', url: '' }])}>+ Add track</button>
                )}
            </Part>

            <Part label={`Festivals played · ${festivals.length}/${MAX_FESTIVALS}`} hint="The year and a link (a set or the line-up) are optional."
                saving={festivalsSave.saving} status={festivalsSave.status}
                onSave={() => festivalsSave.run(() => saveArtistFestivals(slug, festivals.map(f => ({
                    name: trim(f.name), year: f.year === '' ? null : Number(f.year), url: trim(f.url) || null,
                }))))}>
                {festivals.map((festival, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                        <input className="field w-auto flex-1" placeholder="Festival" aria-label="Festival" value={festival.name}
                            onChange={(e) => changeRow(setFestivals, i, 'name', e.target.value)} />
                        <input className="field w-24" type="number" min="1965" max="2100" placeholder="Year" aria-label="Year" value={festival.year}
                            onChange={(e) => changeRow(setFestivals, i, 'year', e.target.value)} />
                        <input className="field w-auto flex-1" type="url" placeholder="https://… (optional)" aria-label="Link" value={festival.url}
                            onChange={(e) => changeRow(setFestivals, i, 'url', e.target.value)} />
                        <button type="button" className="btn btn--ghost" onClick={() => removeRow(setFestivals, i)} aria-label={`Remove ${festival.name || 'this festival'}`}>✕</button>
                    </div>
                ))}
                {festivals.length < MAX_FESTIVALS && (
                    <button type="button" className="btn w-fit" onClick={() => setFestivals(prev => [...prev, { name: '', year: '', url: '' }])}>+ Add festival</button>
                )}
            </Part>

            <Part label="Genres on the map"
                hint={isAdmin ? 'As an admin your change applies at once.' : 'Up to four. An admin checks it first, because it moves your satellite on the map for everyone.'}
                saving={genresSave.saving} status={genresSave.status}
                onSave={() => genresSave.run(async () => { await requestArtistChange(slug, { kind: 'GENRES', genres }); await reload() },
                    isAdmin ? 'Saved.' : 'Sent to an admin.')}>
                <div className="flex flex-wrap items-center gap-2">
                    {genres.length === 0 && <span className="muted text-sm">Not on the map yet</span>}
                    {genres.map(id => <GenreChip key={id} id={id} onRemove={() => setGenres(prev => prev.filter(g => g !== id))} />)}
                    {genres.length < MAX_GENRES && <AddGenre exclude={genres} onAdd={(id) => setGenres(prev => [...prev, id])} />}
                </div>
                {pending('GENRES') && (
                    <p className="mono text-xs muted m-0">
                        Waiting for an admin: {pending('GENRES').value.split(',').map(id => genreById[id]?.name ?? id).join(', ')}
                    </p>
                )}
            </Part>

            <Part label="Name on the profile"
                hint={isAdmin ? 'As an admin your change applies at once.' : 'An admin checks it first. Line-ups still find you by the name organizers write.'}
                saving={nameSave.saving} status={nameSave.status}
                onSave={() => nameSave.run(async () => { await requestArtistChange(slug, { kind: 'NAME', name: name.trim() }); await reload() },
                    isAdmin ? 'Saved.' : 'Sent to an admin.')}>
                <input className="field" aria-label="Name on the profile" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                {pending('NAME') && <p className="mono text-xs muted m-0">Waiting for an admin: {pending('NAME').value}</p>}
            </Part>

            {isAdmin && (
                <Part label="Owner account (admins only)"
                    hint="The account of the artist, who can then edit this profile. Link it once you know it is really them."
                    saving={ownerSave.saving} status={ownerSave.status}
                    onSave={() => ownerSave.run(async () => {
                        if (owner.trim()) await setArtistOwner(slug, owner.trim())
                        else await removeArtistOwner(slug)
                        await reload()
                    })}>
                    <input className="field" aria-label="Owner username" placeholder="Username (empty: nobody)" value={owner}
                        onChange={(e) => setOwner(e.target.value)} />
                    <p className="mono text-xs muted m-0">Now: {edit.owner ? `@${edit.owner}` : 'nobody'}</p>
                </Part>
            )}
        </div>
    )
}

export default ArtistEdit
