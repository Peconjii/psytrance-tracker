import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { askForPage } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import BotTrap from '../components/BotTrap.jsx'
import ImageField from '../components/ImageField.jsx'
import { AddGenre, GenreChip } from '../components/AdminParts'
import usePageMeta from '../hooks/usePageMeta.js'

const KINDS = [
    { id: 'ARTIST', label: 'Artist', hint: 'A producer or DJ. If an admin says yes, the page is made at once and it is yours.' },
    { id: 'ORGANIZER', label: 'Organizer', hint: 'A crew that runs parties. If an admin says yes, the page is made at once and it is yours.' },
    { id: 'LABEL', label: 'Label', hint: 'Labels are constellations of the map: an admin adds it with the next update of the map, then you can claim it.' },
    { id: 'FESTIVAL', label: 'Festival', hint: 'Festivals are stations of the map: an admin adds it with the next update of the map, then you can claim it.' },
]

// "Not on the map yet?": ask for a page of an artist, organizer, label or festival the site doesn't have
function NewPage() {
    usePageMeta({ title: 'Not on the map yet?', path: '/new-page', noindex: true })
    const { user } = useAuth()
    const location = useLocation()
    const [params] = useSearchParams()
    const [form, setForm] = useState({
        kind: KINDS.some(k => k.id === params.get('kind')) ? params.get('kind') : 'ARTIST',
        name: params.get('name') ?? '', country: '', websiteUrl: '', proofUrl: '', message: '',
        since: '', description: '', imageUrl: '', artists: '', town: '',
        // Never shown to people; bots fill it in
        website: '',
    })
    // The map genres it sounds like: where a satellite (artist) or marker (label, festival) could go
    const [genreIds, setGenreIds] = useState([])
    const maxGenres = form.kind === 'ARTIST' ? 4 : 6
    const [state, setState] = useState({ sending: false, done: false, error: '' })
    const kind = KINDS.find(k => k.id === form.kind)
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

    const send = async (e) => {
        e.preventDefault()
        setState({ sending: true, done: false, error: '' })
        try {
            const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
            await askForPage({ ...trimmed, genres: genreIds.slice(0, maxGenres).join(', '), since: trimmed.since ? Number(trimmed.since) : null })
            setState({ sending: false, done: true, error: '' })
        } catch (err) {
            const data = err.response?.data
            setState({ sending: false, done: false, error: data?.errors ? 'Links must be https:// addresses.' : data?.message || 'Could not send. Try again.' })
        }
    }

    return (
        <div className="page max-w-2xl">
            <header className="page-head">
                <div className="page-head__tag">// Uncharted</div>
                <h1 className="page-title">Not on the map yet?</h1>
                <p className="soft mt-2 mb-0">
                    Ask for a page of an artist, organizer, label or festival we don't have. An admin looks at it; once it's on
                    the site, it's yours to edit.
                </p>
            </header>

            {!user ? (
                <p className="panel m-0">
                    <Link className="link" to="/login" state={{ from: location.pathname + location.search }}>Log in</Link> to ask for a page.
                </p>
            ) : state.done ? (
                <div className="panel grid gap-3">
                    <p className="notice notice--ok m-0">Thanks! An admin looks at it soon. You see the answer on your profile.</p>
                    <div className="flex flex-wrap gap-2">
                        <Link className="btn" to="/profile">Your profile</Link>
                        <button type="button" className="btn btn--ghost" onClick={() => {
                            setForm(f => ({ ...f, name: '', country: '', websiteUrl: '', proofUrl: '', message: '', since: '', description: '', imageUrl: '', artists: '', town: '' }))
                            setGenreIds([])
                            setState({ sending: false, done: false, error: '' })
                        }}>Ask for another</button>
                    </div>
                </div>
            ) : (
                <form className="panel grid gap-4" onSubmit={send}>
                    <fieldset className="border-0 p-0 m-0">
                        <legend className="field-label">What is it?</legend>
                        <div className="flex flex-wrap gap-2" role="radiogroup">
                            {KINDS.map(k => (
                                <button key={k.id} type="button" role="radio" aria-checked={form.kind === k.id}
                                    className={'chip' + (form.kind === k.id ? ' is-on' : '')}
                                    onClick={() => setForm(f => ({ ...f, kind: k.id }))}>{k.label}</button>
                            ))}
                        </div>
                        <p className="mono text-xs muted mt-2 mb-0">{kind.hint}</p>
                    </fieldset>
                    <div>
                        <label htmlFor="np-name" className="field-label">Name</label>
                        <input id="np-name" className="field" required maxLength={200} value={form.name} onChange={set('name')} />
                    </div>
                    <div>
                        <label htmlFor="np-country" className="field-label">Country (optional)</label>
                        <input id="np-country" className="field" maxLength={100} value={form.country} onChange={set('country')} />
                    </div>
                    <div>
                        <label htmlFor="np-website" className="field-label">Official website, Bandcamp or SoundCloud</label>
                        <input id="np-website" type="url" className="field" placeholder="https://…" maxLength={500}
                            value={form.websiteUrl} onChange={set('websiteUrl')} />
                    </div>
                    <div>
                        <label htmlFor="np-proof" className="field-label">A link that shows it's you (official Instagram…)</label>
                        <input id="np-proof" type="url" className="field" placeholder="https://…" maxLength={500}
                            value={form.proofUrl} onChange={set('proofUrl')} />
                    </div>
                    <div>
                        <span className="field-label">{form.kind === 'ARTIST' ? 'Genres you play' : 'What it sounds like'} (up to {maxGenres})</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {genreIds.slice(0, maxGenres).map(id => (
                                <GenreChip key={id} id={id} onRemove={() => setGenreIds(g => g.filter(x => x !== id))} />
                            ))}
                            {genreIds.length < maxGenres && (
                                <AddGenre exclude={genreIds} onAdd={(id) => setGenreIds(g => [...g, id])} />
                            )}
                        </div>
                        <p className="mono text-xs muted mt-1 mb-0">
                            {form.kind === 'ARTIST' ? 'Where your satellite could orbit; an admin checks it.'
                                : form.kind === 'ORGANIZER' ? 'The sound of your parties.'
                                    : 'It sits on the map next to these stars; an admin checks it.'}
                        </p>
                    </div>
                    {form.kind !== 'ARTIST' && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="np-since" className="field-label">Since (year, optional)</label>
                                <input id="np-since" className="field" inputMode="numeric" maxLength={4} placeholder="e.g. 2015"
                                    value={form.since} onChange={(e) => setForm(f => ({ ...f, since: e.target.value.replace(/\D/g, '') }))} />
                            </div>
                            {form.kind === 'FESTIVAL' && (
                                <div>
                                    <label htmlFor="np-town" className="field-label">Town or place (optional)</label>
                                    <input id="np-town" className="field" maxLength={100} value={form.town} onChange={set('town')} />
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <label htmlFor="np-description" className="field-label">
                            {form.kind === 'ARTIST' ? 'A few words about you' : `A few words about the ${kind.label.toLowerCase()}`} (optional)
                        </label>
                        <textarea id="np-description" className="field" rows={3} maxLength={1000} value={form.description}
                            onChange={set('description')} />
                    </div>
                    <ImageField id="np-image" label={`${form.kind === 'ARTIST' ? 'A photo' : 'A logo'} (optional)`}
                        value={form.imageUrl} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} />
                    {form.kind === 'LABEL' && (
                        <div>
                            <label htmlFor="np-artists" className="field-label">Artists on the label (optional)</label>
                            <textarea id="np-artists" className="field" rows={2} maxLength={1000} placeholder="One per line, or separated by commas"
                                value={form.artists} onChange={set('artists')} />
                            <p className="mono text-xs muted mt-1 mb-0">The ones the site knows from line-ups join the crew right away.</p>
                        </div>
                    )}
                    <div>
                        <label htmlFor="np-message" className="field-label">Anything else for the admin (optional)</label>
                        <textarea id="np-message" className="field" rows={3} maxLength={1000} value={form.message} onChange={set('message')} />
                    </div>
                    <BotTrap id="np-trap" value={form.website} onChange={(website) => setForm(f => ({ ...f, website }))} />
                    <div>
                        <button type="submit" className="btn btn--primary" disabled={state.sending}>{state.sending ? 'Sending…' : 'Ask for the page'}</button>
                    </div>
                    {state.error && (
                        <p className="notice m-0">
                            {state.error}{state.error.includes('Confirm your email') && <> <Link className="link" to="/profile">Your profile</Link></>}
                        </p>
                    )}
                </form>
            )}
        </div>
    )
}

export default NewPage
