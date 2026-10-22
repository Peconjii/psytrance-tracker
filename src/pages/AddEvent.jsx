import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchOurEvent, submitOurEvent, updateOurEvent } from '../api/backend.js'
import { searchPlaces } from '../api/places.js'
import { AddGenre, GenreChip } from '../components/AdminParts'
import StageCards from '../components/StageCards.jsx'
import { emptyStage, eventDays, lineUpOf, stagesOf } from '../components/stageText.js'
import VerifyEmailNotice from '../components/VerifyEmailNotice.jsx'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta.js'

// The kinds of event the backend accepts (OurEvents.TYPES), the same as on Goabase
const TYPES = ['Festival', 'Open Air', 'Club', 'Indoor', 'In- & Outdoor']
const MAX_GENRES = 4
const LINKS = [
    { key: 'ticketUrl', label: 'Tickets or event page', placeholder: 'https://…' },
    { key: 'organizerUrl', label: 'Organizer website', placeholder: 'https://…' },
    { key: 'imageUrl', label: 'Flyer (image link)', placeholder: 'https://…' },
]
const EMPTY = {
    name: '', eventType: 'Festival', startsAt: '', endsAt: '', lineUp: '', organizerName: '', locationText: '',
    entryFee: '', info: '', ticketUrl: '', organizerUrl: '', imageUrl: '',
}

function errorOf(err) {
    const data = err.response?.data
    if (data?.errors) return 'Some fields need a fix: ' + Object.entries(data.errors).map(([f, why]) => `${f} ${why}`).join(', ')
    return data?.message || 'Could not send the event. Try again.'
}

// "2026-11-14T22:00:00" from the backend -> "2026-11-14T22:00" for a datetime-local field
const toField = (value) => (value ? value.slice(0, 16) : '')

// Adding an event on our site, next to the ones from Goabase. Needs a confirmed email; an admin checks it before it
// goes on the map (the organizer's own account and admins skip that). With an id (/events/added/7/edit) it changes
// one the account sent instead: a waiting one keeps waiting, an approved one changes on the map right away.
function AddEvent() {
    const { id: editId } = useParams()
    usePageMeta({ title: editId ? 'Edit your event' : 'Add an event', path: editId ? `/events/added/${editId}/edit` : '/events/new', noindex: true })
    const { user } = useAuth()
    const [form, setForm] = useState(EMPTY)
    const [genres, setGenres] = useState([])
    const [placeQuery, setPlaceQuery] = useState('')
    const [places, setPlaces] = useState(null)
    const [place, setPlace] = useState(null)
    const [searching, setSearching] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(null)
    const [loaded, setLoaded] = useState(!editId)
    // The line-up as stage cards, or as text (pasted, or a line-up the cards can't show)
    const [stages, setStages] = useState(() => [emptyStage()])
    const [asText, setAsText] = useState(false)
    const [textNote, setTextNote] = useState('')
    const days = eventDays(form.startsAt, form.endsAt)
    const lineUp = asText ? form.lineUp : lineUpOf(stages, days)

    const showCards = () => {
        const found = form.lineUp.trim() ? stagesOf(form.lineUp) : [emptyStage()]
        if (!found) return setTextNote('This text has more than names and set times, so it stays text. Clear it to start with cards.')
        setStages(found)
        setAsText(false)
        setTextNote('')
    }
    const showText = () => {
        setForm(f => ({ ...f, lineUp: lineUpOf(stages, days) }))
        setAsText(true)
    }

    // Editing: the form starts with the event as it is
    useEffect(() => {
        if (!editId) return
        const controller = new AbortController()
        fetchOurEvent(editId, controller.signal)
            .then(ev => {
                setForm(Object.fromEntries(Object.keys(EMPTY).map(key => [key,
                    key === 'startsAt' || key === 'endsAt' ? toField(ev[key]) : (ev[key] ?? '')])))
                setGenres(ev.genres)
                // A line-up the cards wrote opens as cards again; any other text stays text
                const found = ev.lineUp?.trim() ? stagesOf(ev.lineUp) : [emptyStage()]
                if (found) setStages(found)
                setAsText(!found)
                setPlace({ name: ev.town, region: '', country: ev.country, lat: ev.lat, lon: ev.lon, timeZone: ev.timeZone })
                setLoaded(true)
            })
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the event.') })
        return () => controller.abort()
    }, [editId])

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

    const findPlace = async () => {
        if (!placeQuery.trim()) return
        setSearching(true)
        setError('')
        try {
            setPlaces(await searchPlaces(placeQuery.trim()))
        } catch {
            setError('Could not search places right now. Try again.')
        } finally {
            setSearching(false)
        }
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!place) return setError('Pick the town from the search results, so the ship lands in the right place.')
        setSending(true)
        setError('')
        try {
            const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
            const save = editId ? (event) => updateOurEvent(editId, event) : submitOurEvent
            setSent(await save({
                ...trimmed,
                lineUp: lineUp.trim(),
                // datetime-local gives "2026-11-14T22:00"; the backend wants seconds too
                startsAt: trimmed.startsAt.length === 16 ? trimmed.startsAt + ':00' : trimmed.startsAt,
                endsAt: trimmed.endsAt ? (trimmed.endsAt.length === 16 ? trimmed.endsAt + ':00' : trimmed.endsAt) : null,
                timeZone: place.timeZone,
                country: place.country,
                town: place.name,
                lat: place.lat,
                lon: place.lon,
                genres,
            }))
        } catch (err) {
            setError(errorOf(err))
        } finally {
            setSending(false)
        }
    }

    if (sent) {
        return (
            <div className="page page--narrow">
                <div className="panel grid gap-4">
                    <div className="page-head__tag">// Launch request</div>
                    <h1 className="page-title m-0">{sent.name}</h1>
                    {sent.status === 'APPROVED' ? (
                        <>
                            <p className="notice notice--ok m-0">
                                {editId ? 'Saved: the map shows the change now.' : 'It is on the map now.'} Its line-up is read within half an hour.
                            </p>
                            <Link className="btn btn--primary" to={`/events/${sent.eventId}`}>Open the event</Link>
                        </>
                    ) : (
                        <p className="notice notice--ok m-0">
                            {editId ? 'Saved. It still waits for an admin.' : 'Thanks! An admin checks it soon, then it goes on the map.'}
                            {' '}You see its status on your <Link className="link" to="/profile">profile</Link>.
                        </p>
                    )}
                    {!editId && (
                        <button type="button" className="btn btn--ghost" onClick={() => { setSent(null); setForm(EMPTY); setGenres([]); setPlace(null); setPlaces(null) }}>
                            Add another event
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="page page--narrow grid gap-4">
            <header className="page-head m-0">
                <div className="page-head__tag">// {editId ? 'Refit a ship' : 'Launch a ship'}</div>
                <h1 className="page-title">{editId ? 'Edit your event' : 'Add an event'}</h1>
                <p className="page-head__sub">
                    {editId
                        ? 'A change to an event on the map shows right away; one still waiting keeps waiting for an admin.'
                        : 'For events that are not on Goabase. An admin checks it before it goes on the map; organizers whose page is linked to their account are on the map right away.'}
                </p>
            </header>

            {!loaded ? (
                error ? <p className="notice">{error}</p> : <p className="mono text-xs muted">Loading…</p>
            ) : !user?.emailVerified && !user?.admin ? (
                <VerifyEmailNotice reason="Only accounts with a confirmed email can add events, so the map stays free of spam." />
            ) : (
                <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
                    <section className="panel grid gap-3">
                        <h2 className="panel__label m-0">The event</h2>
                        <div>
                            <label htmlFor="ev-name" className="field-label">Name</label>
                            <input id="ev-name" className="field" required maxLength={200} value={form.name} onChange={set('name')} />
                        </div>
                        <div>
                            <label htmlFor="ev-type" className="field-label">Kind</label>
                            <select id="ev-type" className="field" value={form.eventType} onChange={set('eventType')}>
                                {TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="ev-start" className="field-label">Starts (venue time)</label>
                                <input id="ev-start" type="datetime-local" className="field" required value={form.startsAt} onChange={set('startsAt')} />
                            </div>
                            <div>
                                <label htmlFor="ev-end" className="field-label">Ends (optional)</label>
                                <input id="ev-end" type="datetime-local" className="field" value={form.endsAt} min={form.startsAt || undefined} onChange={set('endsAt')} />
                            </div>
                        </div>
                    </section>

                    <section className="panel grid gap-3">
                        <h2 className="panel__label m-0">Where</h2>
                        <div className="flex gap-2">
                            <input className="field" aria-label="Town" placeholder="Town, e.g. Idanha-a-Nova" value={placeQuery}
                                onChange={(e) => setPlaceQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findPlace() } }} />
                            <button type="button" className="btn shrink-0" onClick={findPlace} disabled={searching}>
                                {searching ? 'Searching…' : 'Find'}
                            </button>
                        </div>
                        {places && places.length === 0 && <p className="muted text-sm m-0">No town found. Try another spelling.</p>}
                        {places && places.length > 0 && !place && (
                            <ul className="rows">
                                {places.map(p => (
                                    <li key={`${p.lat},${p.lon}`}>
                                        <button type="button" className="rows__item w-full text-left bg-transparent border-0 cursor-pointer"
                                            onClick={() => setPlace(p)}>
                                            <span className="rows__name">{p.name}</span>
                                            <span className="rows__meta">{[p.region, p.country].filter(Boolean).join(', ')}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {place && (
                            <p className="mono text-xs soft m-0">
                                ◆ {place.name}, {[place.region, place.country].filter(Boolean).join(', ')} · {place.timeZone}
                                {' '}<button type="button" className="link bg-transparent border-0 p-0 cursor-pointer" onClick={() => setPlace(null)}>change</button>
                            </p>
                        )}
                        <div>
                            <label htmlFor="ev-location" className="field-label">Venue and how to get there (optional)</label>
                            <textarea id="ev-location" className="field" rows={2} maxLength={2000} value={form.locationText} onChange={set('locationText')} />
                        </div>
                    </section>

                    <section className="panel grid grid-cols-1 gap-3">
                        <h2 className="panel__label m-0">Sound</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            {genres.map(id => (
                                <GenreChip key={id} id={id} onRemove={() => setGenres(g => g.filter(x => x !== id))} />
                            ))}
                            {genres.length < MAX_GENRES && (
                                <AddGenre exclude={genres} onAdd={(id) => setGenres(g => [...g, id])} />
                            )}
                        </div>
                        <p className="muted text-sm m-0">Up to {MAX_GENRES} genres: they decide where the ship flies.</p>
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="field-label m-0">Line-up and timetable</span>
                                <button type="button" className="link mono text-xs bg-transparent border-0 p-0 cursor-pointer"
                                    onClick={asText ? showCards : showText}>
                                    {asText ? 'Use stage cards →' : 'Paste or write as text →'}
                                </button>
                            </div>
                            {asText ? (
                                <textarea id="ev-lineup" aria-label="Line-up" className="field mono text-sm" rows={8} maxLength={10000} value={form.lineUp} onChange={set('lineUp')}
                                    placeholder={'One artist per line. Stage names, days and set times are understood:\n\nMAIN STAGE\nSat 22:00 Ajja (live)\nSun 00:00 Tristan\n\nCHILL OUT\nSun 14:00 Kaya Project'} />
                            ) : (
                                <>
                                    <StageCards stages={stages} onChange={setStages} days={days} />
                                    <p className="muted text-sm mt-2 mb-0">
                                        {days.length ? 'Times on the clock at the venue; the end is optional. A set without a time just lists the artist.'
                                            : 'Pick when the event starts (above) to give the sets their days.'}
                                        {' '}“✓ page”: the artist is on the site and the set links to their page.
                                    </p>
                                </>
                            )}
                            {textNote && <p className="notice mt-2 mb-0">{textNote}</p>}
                            {lineUp.length > 10000 && <p className="notice mt-2 mb-0">The line-up is too long (10 000 characters at most).</p>}
                        </div>
                    </section>

                    <section className="panel grid gap-3">
                        <h2 className="panel__label m-0">More</h2>
                        <div>
                            <label htmlFor="ev-organizer" className="field-label">Organizer</label>
                            <input id="ev-organizer" className="field" maxLength={200} value={form.organizerName} onChange={set('organizerName')} />
                        </div>
                        {LINKS.map(link => (
                            <div key={link.key}>
                                <label htmlFor={`ev-${link.key}`} className="field-label">{link.label}</label>
                                <input id={`ev-${link.key}`} type="url" className="field" maxLength={500} placeholder={link.placeholder}
                                    value={form[link.key]} onChange={set(link.key)} />
                            </div>
                        ))}
                        <div>
                            <label htmlFor="ev-fee" className="field-label">Entry fee</label>
                            <input id="ev-fee" className="field" maxLength={500} value={form.entryFee} onChange={set('entryFee')} />
                        </div>
                        <div>
                            <label htmlFor="ev-info" className="field-label">About the event</label>
                            <textarea id="ev-info" className="field" rows={4} maxLength={5000} value={form.info} onChange={set('info')} />
                        </div>
                    </section>

                    {error && <p className="notice m-0">{error}</p>}
                    <button type="submit" className="btn btn--primary btn--block" disabled={sending}>
                        {sending ? 'Sending…' : editId ? 'Save the changes' : 'Send the event'}
                    </button>
                </form>
            )}
        </div>
    )
}

export default AddEvent
