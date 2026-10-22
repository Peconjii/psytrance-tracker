import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitOurEvent } from '../api/backend.js'
import { searchPlaces } from '../api/places.js'
import { AddGenre, GenreChip } from '../components/AdminParts'
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

// Adding an event on our site, next to the ones from Goabase. Needs a confirmed email; an admin checks it before it
// goes on the map (the organizer's own account and admins skip that).
function AddEvent() {
    usePageMeta({ title: 'Add an event', path: '/events/new', noindex: true })
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
            setSent(await submitOurEvent({
                ...trimmed,
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
                            <p className="notice notice--ok m-0">It is on the map now. Its line-up is read within half an hour.</p>
                            <Link className="btn btn--primary" to={`/events/${sent.eventId}`}>Open the event</Link>
                        </>
                    ) : (
                        <p className="notice notice--ok m-0">
                            Thanks! An admin checks it soon, then it goes on the map. You see its status on your
                            {' '}<Link className="link" to="/profile">profile</Link>.
                        </p>
                    )}
                    <button type="button" className="btn btn--ghost" onClick={() => { setSent(null); setForm(EMPTY); setGenres([]); setPlace(null); setPlaces(null) }}>
                        Add another event
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="page page--narrow grid gap-4">
            <header className="page-head m-0">
                <div className="page-head__tag">// Launch a ship</div>
                <h1 className="page-title">Add an event</h1>
                <p className="page-head__sub">
                    For events that are not on Goabase. An admin checks it before it goes on the map; organizers whose page
                    is linked to their account are on the map right away.
                </p>
            </header>

            {!user?.emailVerified && !user?.admin ? (
                <VerifyEmailNotice reason="Only accounts with a confirmed email can add events, so the map stays free of spam." />
            ) : (
                <form className="grid gap-4" onSubmit={submit}>
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

                    <section className="panel grid gap-3">
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
                            <label htmlFor="ev-lineup" className="field-label">Line-up</label>
                            <textarea id="ev-lineup" className="field mono text-sm" rows={8} maxLength={10000} value={form.lineUp} onChange={set('lineUp')}
                                placeholder={'One artist per line. Stage names and set times are understood (a time earlier than the one before is the next day):\n\nMAIN STAGE\n22:00 Ajja (live)\n00:00 Tristan\n\nCHILL OUT\n14:00 Kaya Project'} />
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
                        {sending ? 'Sending…' : 'Send the event'}
                    </button>
                </form>
            )}
        </div>
    )
}

export default AddEvent
