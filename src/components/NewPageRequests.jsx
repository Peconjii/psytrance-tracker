import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideNewPageRequest, fetchNewPageRequests } from '../api/backend.js'
import { TrustCheckbox } from './TrustPanel.jsx'
import { reloadMapExtrasLater } from '../map/data/extras'
import MapPlaceFields from './MapPlaceFields.jsx'
import { emptyMapPlace, mapPlaceOf } from './mapPlace.js'
import { GenreChip } from './AdminParts'
import { genreById } from '../map/data/types'

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const KIND = { ARTIST: 'Artist', ORGANIZER: 'Organizer', LABEL: 'Label', FESTIVAL: 'Festival' }
const MADE = {
    ARTIST: (slug) => `/artists/${encodeURIComponent(slug)}`,
    ORGANIZER: (slug) => `/organizers/${encodeURIComponent(slug)}`,
    LABEL: (name) => `/labels/${encodeURIComponent(name)}`,
    FESTIVAL: (id) => `/festivals/${encodeURIComponent(id)}`,
}
const onTheMap = (kind) => kind === 'LABEL' || kind === 'FESTIVAL'

// For admins: "Not on the map yet?" requests. Approving an artist or organizer makes the page with its owner.
// A label or festival with genres picked goes on the map right away, owner included; without genres it is only noted.
function NewPageRequests() {
    const [requests, setRequests] = useState(null)
    const [reasons, setReasons] = useState({})
    // Per request: where a label or festival goes on the map ({ country, since, description, genres })
    const [places, setPlaces] = useState({})
    const [error, setError] = useState('')
    const [deciding, setDeciding] = useState(null)
    const [made, setMade] = useState([])

    useEffect(() => {
        const controller = new AbortController()
        fetchNewPageRequests(controller.signal)
            .then(setRequests)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the new page requests.') })
        return () => controller.abort()
    }, [])

    // Starts from what the asker proposed: their genres (the ones the map has), year and words
    const placeOf = (r) => places[r.id] ?? {
        ...emptyMapPlace(r.country ?? ''),
        since: r.since ? String(r.since) : '',
        description: r.description ?? '',
        genres: (r.genres ?? '').split(',').map(g => g.trim()).filter(g => genreById[g]).slice(0, 6),
    }

    // Requests whose new owner is trusted with the approval
    const [trusted, setTrusted] = useState({})

    const decide = async (request, approve) => {
        setDeciding(request.id)
        setError('')
        try {
            const place = placeOf(request)
            const addNow = approve && onTheMap(request.kind) && place.genres.length > 0
            const decided = await decideNewPageRequest(request.id, approve, reasons[request.id]?.trim() || null,
                addNow ? mapPlaceOf(place) : null, approve && Boolean(trusted[request.id]))
            if (addNow) reloadMapExtrasLater()
            setRequests(list => list.filter(r => r.id !== request.id))
            if (approve) setMade(list => [decided, ...list])
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setDeciding(null)
        }
    }

    if (error && !requests) return <p className="notice">{error}</p>
    if (!requests || (requests.length === 0 && made.length === 0)) return null

    return (
        <section className="mt-8">
            <h2 className="panel__label">New pages · {requests.length} waiting</h2>
            {error && <p className="notice">{error}</p>}
            {made.map(r => (
                <p key={r.id} className="notice notice--ok">
                    {r.createdSlug
                        ? <>{onTheMap(r.kind) ? 'On the map' : 'Made'}: <Link className="link" to={MADE[r.kind](r.createdSlug)}>{r.name}</Link>, owned by @{r.username}.</>
                        : <>Noted: {KIND[r.kind].toLowerCase()} {r.name} waits to be added to the map (Admin → Requests → Add to the map).</>}
                </p>
            ))}
            <ul className="grid gap-3 list-none p-0 m-0">
                {requests.map(r => {
                    const place = placeOf(r)
                    return (
                        <li key={r.id} className="panel grid gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="badge">{KIND[r.kind]}</span>
                                <strong>{r.name}</strong>
                                {r.country && <span className="mono text-xs muted">{r.country}</span>}
                                <span className="mono text-xs muted ml-auto">@{r.username} · {r.email} · {DATE.format(new Date(r.createdAt))}</span>
                            </div>
                            {[r.websiteUrl, r.proofUrl].filter(Boolean).map(link => (
                                <a key={link} className="link mono text-xs" href={link} target="_blank" rel="noopener noreferrer">{link} ↗</a>
                            ))}
                            {r.genres && (
                                <div className="flex flex-wrap items-center gap-1">
                                    <span className="mono text-xs muted">Sounds like:</span>
                                    {r.genres.split(',').map(g => g.trim()).filter(Boolean).map(g => (
                                        genreById[g] ? <GenreChip key={g} id={g} /> : <span key={g} className="mono text-xs soft">{g}</span>
                                    ))}
                                </div>
                            )}
                            {(r.since || r.town) && (
                                <p className="mono text-xs muted m-0">
                                    {[r.since && `since ${r.since}`, r.town && `in ${r.town}`].filter(Boolean).join(' · ')}
                                </p>
                            )}
                            {r.description && <p className="soft text-sm whitespace-pre-line m-0">“{r.description}”</p>}
                            {r.imageUrl && (
                                <a className="link mono text-xs flex items-center gap-2 w-fit" href={r.imageUrl} target="_blank" rel="noopener noreferrer">
                                    <img className="image-field__preview" src={r.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                                    {r.kind === 'ARTIST' ? 'Photo' : 'Logo'} ↗
                                </a>
                            )}
                            {r.artists && (
                                <p className="mono text-xs soft m-0">
                                    Artists on it: {r.artists}
                                    <span className="block muted">The ones the site knows from line-ups join the crew on approval; the others later.</span>
                                </p>
                            )}
                            {r.message && <p className="soft text-sm whitespace-pre-line m-0">{r.message}</p>}
                            {onTheMap(r.kind) && (
                                <p className="mono text-xs muted m-0">Filled in from the proposal below: check it, change what's wrong, then approve.</p>
                            )}
                            {onTheMap(r.kind) && (
                                <MapPlaceFields kind={r.kind} idPrefix={`request-${r.id}`} value={place}
                                    onChange={(value) => setPlaces(x => ({ ...x, [r.id]: value }))} />
                            )}
                            {/* A label or festival gets its owner only when it goes on the map now */}
                            {(!onTheMap(r.kind) || place.genres.length > 0) && (
                                <TrustCheckbox kind={r.kind} id={`request-trust-${r.id}`} checked={Boolean(trusted[r.id])}
                                    onChange={(on) => setTrusted(t => ({ ...t, [r.id]: on }))} />
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <button className="btn btn--primary" disabled={deciding !== null} onClick={() => decide(r, true)}>
                                    {deciding === r.id ? 'Saving…'
                                        : !onTheMap(r.kind) ? 'Approve and make the page'
                                            : place.genres.length ? 'Approve and add to the map' : 'Approve (add to the map later)'}
                                </button>
                                <input className="field flex-1 min-w-48" aria-label="Reason" maxLength={500} placeholder="Reason if not (shown to them)"
                                    value={reasons[r.id] ?? ''} onChange={(e) => setReasons(x => ({ ...x, [r.id]: e.target.value }))} />
                                <button className="btn btn--ghost" disabled={deciding !== null} onClick={() => decide(r, false)}>Reject</button>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default NewPageRequests
