import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { askForPage } from '../api/backend.js'
import { useAuth } from '../context/AuthContext'
import BotTrap from '../components/BotTrap.jsx'
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
        name: params.get('name') ?? '', country: '', websiteUrl: '', proofUrl: '', genres: '', message: '',
        // Never shown to people; bots fill it in
        website: '',
    })
    const [state, setState] = useState({ sending: false, done: false, error: '' })
    const kind = KINDS.find(k => k.id === form.kind)
    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

    const send = async (e) => {
        e.preventDefault()
        setState({ sending: true, done: false, error: '' })
        try {
            const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
            await askForPage({ ...trimmed, genres: form.kind === 'ARTIST' ? trimmed.genres : '' })
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
                            setForm(f => ({ ...f, name: '', country: '', websiteUrl: '', proofUrl: '', genres: '', message: '' }))
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
                    {form.kind === 'ARTIST' && (
                        <div>
                            <label htmlFor="np-genres" className="field-label">Genres you play (optional)</label>
                            <input id="np-genres" className="field" placeholder="e.g. dark, forest" maxLength={300}
                                value={form.genres} onChange={set('genres')} />
                            <p className="mono text-xs muted mt-1 mb-0">An admin decides where on the map your satellite orbits.</p>
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
