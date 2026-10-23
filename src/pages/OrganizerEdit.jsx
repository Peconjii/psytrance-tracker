import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    fetchOrganizerEdit, handBackOrganizerTimetable, removeOrganizerOwner, saveOrganizerProfile, setOrganizerOwner,
    setOrganizerTimetable,
} from '../api/backend.js'
import TimetableEditor from '../components/TimetableEditor.jsx'
import OwnerNumbers from '../components/OwnerNumbers.jsx'
import LinkFields from '../components/LinkFields.jsx'
import usePageMeta from '../hooks/usePageMeta.js'
import { errorOf } from '../components/formErrors.js'

const FIELDS = [
    { key: 'photoUrl', label: 'Photo or logo', placeholder: 'https://…', image: 'square' },
    { key: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/…' },
    { key: 'websiteUrl', label: 'Website', placeholder: 'https://…' },
]
const MAX_BIO = 1000
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// Editing an organizer's page: by the organizer (an account an admin linked to them) or an admin. Besides the page,
// they write the timetables of their own events, which send the events' live fleets across the map.
function OrganizerEdit() {
    const { slug } = useParams()
    const { user } = useAuth()
    const [edit, setEdit] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [profile, setProfile] = useState(null)
    const [owner, setOwner] = useState('')
    const [open, setOpen] = useState(null)
    const [status, setStatus] = useState({ profile: null, owner: null })
    const [saving, setSaving] = useState(null)

    usePageMeta({ title: `Edit · ${edit?.name || slug}`, path: `/organizers/${slug}/edit`, noindex: true })

    const show = (found) => {
        setEdit(found)
        setProfile({ ...Object.fromEntries(FIELDS.map(f => [f.key, found[f.key] ?? ''])), bio: found.bio ?? '' })
        setOwner(found.owner || '')
    }

    useEffect(() => {
        const controller = new AbortController()
        fetchOrganizerEdit(slug, controller.signal)
            .then(show)
            .catch(err => {
                if (controller.signal.aborted) return
                setLoadError(err.response?.status === 403 ? 'Only the organizer and admins can edit this page.'
                    : err.response?.data?.message || 'Could not load the page.')
            })
        return () => controller.abort()
    }, [slug])

    const run = async (part, action) => {
        setSaving(part)
        setStatus(s => ({ ...s, [part]: null }))
        try {
            await action()
            setStatus(s => ({ ...s, [part]: { ok: 'Saved.' } }))
        } catch (err) {
            setStatus(s => ({ ...s, [part]: { error: errorOf(err) } }))
        } finally {
            setSaving(null)
        }
    }

    if (loadError) return <div className="page page--narrow"><p className="notice">{loadError}</p></div>
    if (!edit) return <div className="page page--narrow"><p className="mono text-xs muted">Loading…</p></div>

    const statusLine = (part) => (
        <>
            {status[part]?.ok && <span className="mono text-xs soft" role="status">{status[part].ok}</span>}
            {status[part]?.error && <p className="notice m-0">{status[part].error}</p>}
        </>
    )

    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Captain · edit page</div>
                <h1 className="page-title">{edit.name}</h1>
                <p className="page-head__sub">
                    What you change here shows on <Link className="link" to={`/organizers/${slug}`}>your page</Link> right away.
                </p>
            </header>

            <form className="panel mb-4 grid gap-3" onSubmit={(e) => {
                e.preventDefault()
                run('profile', () => saveOrganizerProfile(slug, Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, v.trim()]))))
            }}>
                <h2 className="panel__label m-0">Page</h2>
                <LinkFields fields={FIELDS} idPrefix="org" values={profile}
                    onChange={(key, value) => setProfile(p => ({ ...p, [key]: value }))} />
                <div>
                    <label htmlFor="org-bio" className="field-label">About · {profile.bio.length}/{MAX_BIO}</label>
                    <textarea id="org-bio" className="field" rows={4} maxLength={MAX_BIO} value={profile.bio}
                        placeholder="Who you are, where you throw parties, your sound…"
                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="btn btn--primary" disabled={saving === 'profile'}>{saving === 'profile' ? 'Saving…' : 'Save'}</button>
                    {statusLine('profile')}
                </div>
            </form>

            <OwnerNumbers kind="organizer" id={slug} />

            <section className="panel mb-4">
                <h2 className="panel__label">Timetables of your events · {edit.events.length}</h2>
                <p className="muted text-sm mt-0">
                    With set times and a genre per set, your event gets a live fleet on the map: one ship per genre,
                    arriving at its star when that genre plays.
                </p>
                {edit.events.length === 0 ? (
                    <p className="muted text-sm m-0">No upcoming events of yours on Goabase right now.</p>
                ) : (
                    <ul className="rows">
                        {edit.events.map(event => (
                            <li key={event.id} className="rows__item admin-artist">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="mono text-xs muted">{event.dateStart ? DAY.format(new Date(event.dateStart + 'T12:00:00')) : 'Date TBA'}</span>
                                    <Link className="link font-medium" to={`/events/${event.id}`}>{event.name}</Link>
                                    <span className="muted text-sm">{event.town}</span>
                                    <button className="btn btn--ghost ml-auto" onClick={() => setOpen(open === event.id ? null : event.id)}>
                                        {open === event.id ? 'Close' : 'Timetable'}
                                    </button>
                                </div>
                                {open === event.id && (
                                    <TimetableEditor key={event.id} id={event.id}
                                        save={(id, sets) => setOrganizerTimetable(slug, id, sets)}
                                        handBack={(id) => handBackOrganizerTimetable(slug, id)} />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {user?.admin && (
                <form className="panel mb-4 grid gap-3" onSubmit={(e) => {
                    e.preventDefault()
                    run('owner', async () => {
                        if (owner.trim()) await setOrganizerOwner(slug, owner.trim())
                        else await removeOrganizerOwner(slug)
                        show(await fetchOrganizerEdit(slug))
                    })
                }}>
                    <h2 className="panel__label m-0">Owner account (admins only)</h2>
                    <p className="muted text-sm m-0">The organizer's account, who can then edit this page. Link it once you know it is really them.</p>
                    <input className="field" aria-label="Owner username" placeholder="Username (empty: nobody)" value={owner}
                        onChange={(e) => setOwner(e.target.value)} />
                    <p className="mono text-xs muted m-0">Now: {edit.owner ? `@${edit.owner}` : 'nobody'}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="submit" className="btn btn--primary" disabled={saving === 'owner'}>{saving === 'owner' ? 'Saving…' : 'Save'}</button>
                        {statusLine('owner')}
                    </div>
                </form>
            )}
        </div>
    )
}

export default OrganizerEdit
