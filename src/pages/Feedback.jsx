import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sendFeedback } from '../api/backend.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { isSitePath } from '../components/sitePath.js'

const KINDS = [
    { value: 'CORRECTION', label: 'Correct the data', hint: 'A genre, artist, festival or event is wrong or missing' },
    { value: 'COMPLAINT', label: 'Something is broken', hint: 'A page, button or the map does not work as it should' },
    { value: 'SUGGESTION', label: 'Improvement', hint: 'Something that would make the site better' },
    { value: 'IDEA', label: 'Idea', hint: 'A new feature, a crazy one is fine' },
    { value: 'OTHER', label: 'Other', hint: 'Anything else' },
]
const ABOUT_LABELS = { GENRE: 'Genre', ARTIST: 'Artist', EVENT: 'Event', FESTIVAL: 'Festival', LABEL: 'Label', PAGE: 'Page' }
const MAX_MESSAGE = 2000

// The feedback form. Links from the map ("✎ Fix") and event pages open it with what it is about filled in:
// /feedback?kind=CORRECTION&about=ARTIST&ref=Ajja&from=/?genre=twilight
function Feedback() {
    usePageMeta({ title: 'Feedback', path: '/feedback', noindex: true })
    const { user } = useAuth()
    const [params] = useSearchParams()
    // Only a page of this site: the link could come from anywhere, and admins open it from the inbox
    const from = isSitePath(params.get('from')) ? params.get('from') : null

    const initialKind = KINDS.some(k => k.value === params.get('kind')) ? params.get('kind') : 'SUGGESTION'
    const initialAbout = ABOUT_LABELS[params.get('about')] && params.get('ref')
        ? { type: params.get('about'), ref: params.get('ref').slice(0, 200) }
        : null

    const [kind, setKind] = useState(initialKind)
    const [about, setAbout] = useState(initialAbout)
    const [message, setMessage] = useState('')
    // "+ Suggest a track" on an artist and "+ Suggest an artist" on a genre (the galaxy): fields for the track or
    // the artist, put together into the message
    const offered = params.get('track') === '1' && initialAbout?.type === 'ARTIST' ? 'track'
        : params.get('artist') === '1' && initialAbout?.type === 'GENRE' ? 'artist' : null
    const [track, setTrack] = useState({ title: '', link: '', year: '' })
    const setTrackField = (field) => (e) => { setTrack(t => ({ ...t, [field]: e.target.value })); setError('') }
    const [email, setEmail] = useState(user?.email || '')
    // Never shown to people; bots fill it in (see the backend's FeedbackService)
    const [website, setWebsite] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        // "✕ Not about this" turns it back into plain feedback
        const suggestion = about ? offered : null
        if (suggestion && track.title.trim().length < 2) {
            return setError(suggestion === 'track' ? 'Write the name of the track.' : 'Write the name of the artist.')
        }
        if (suggestion && track.link.trim() && !/^https?:\/\/\S+$/.test(track.link.trim())) {
            return setError('The link should start with https:// (YouTube, Bandcamp, SoundCloud...).')
        }
        if (!suggestion && message.trim().length < 5) {
            return setError('Write a few more words, so we know what to fix.')
        }
        const text = suggestion
            ? [suggestion === 'track'
                ? `Track suggestion for ${about.ref}: "${track.title.trim()}"${track.year.trim() ? ` (${track.year.trim()})` : ''}`
                : `Artist suggestion for ${about.ref}: "${track.title.trim()}"`,
                track.link.trim() && `Link: ${track.link.trim()}`, message.trim()].filter(Boolean).join('\n')
            : message.trim()
        setSending(true)
        setError('')
        try {
            await sendFeedback({
                kind,
                aboutType: about?.type || null,
                aboutRef: about?.ref || null,
                pageUrl: from,
                message: text.slice(0, MAX_MESSAGE),
                email: email.trim() || null,
                website,
            })
            setSent(true)
        } catch (err) {
            const data = err.response?.data
            setError(data?.errors?.email
                ? 'That email address does not look right.'
                : data?.message || 'Could not send it. Please try again.')
        } finally {
            setSending(false)
        }
    }

    if (sent) {
        return (
            <div className="page page--narrow">
                <div className="panel">
                    <div className="page-head__tag">// Transmission received</div>
                    <h1 className="page-title">Thank you</h1>
                    <p className="soft">
                        Your feedback reached the crew. Corrections to genres and artists are checked by hand
                        before the map changes{email.trim() ? ', and we may write back to you' : ''}.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {from && <Link to={from} className="btn">Back where I was</Link>}
                        <Link to="/" className="btn btn--ghost">To the galaxy</Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page" style={{ maxWidth: 640 }}>
            <header className="page-head">
                <div className="page-head__tag">// Transmission to the crew</div>
                <h1 className="page-title">Feedback</h1>
                <p className="page-head__sub">
                    A wrong genre, a missing artist, a bug or an idea: tell us. You don't need an account.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="panel grid gap-5" noValidate>
                <div>
                    <span className="field-label">What is it?</span>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kind of feedback">
                        {KINDS.map(k => (
                            <button key={k.value} type="button" role="radio" aria-checked={kind === k.value}
                                className={`chip${kind === k.value ? ' is-on' : ''}`} onClick={() => setKind(k.value)}>
                                {k.label}
                            </button>
                        ))}
                    </div>
                    <p className="muted text-sm mt-2 mb-0">{KINDS.find(k => k.value === kind).hint}</p>
                </div>

                {about && (
                    <div>
                        <span className="field-label">About</span>
                        <span className="badge">{ABOUT_LABELS[about.type]} · {about.ref}</span>{' '}
                        <button type="button" className="btn btn--ghost" onClick={() => setAbout(null)}>✕ Not about this</button>
                    </div>
                )}

                {offered === 'artist' && about && (
                    <fieldset className="grid gap-3 m-0 p-0 border-0">
                        <legend className="field-label">An artist for {about.ref}</legend>
                        <div>
                            <label htmlFor="artist-name" className="field-label">Name</label>
                            <input id="artist-name" className="field" value={track.title} onChange={setTrackField('title')}
                                placeholder="e.g. Jimi Hendrix" />
                        </div>
                        <div>
                            <label htmlFor="artist-link" className="field-label">Link <span className="muted">(SoundCloud, Bandcamp, YouTube...)</span></label>
                            <input id="artist-link" type="url" inputMode="url" className="field" value={track.link}
                                onChange={setTrackField('link')} placeholder="https://soundcloud.com/…" />
                        </div>
                    </fieldset>
                )}

                {offered === 'track' && about && (
                    <fieldset className="grid gap-3 m-0 p-0 border-0">
                        <legend className="field-label">The track by {about.ref}</legend>
                        <div>
                            <label htmlFor="track-title" className="field-label">Title</label>
                            <input id="track-title" className="field" value={track.title} onChange={setTrackField('title')}
                                placeholder="e.g. Shine On You Crazy Diamond" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label htmlFor="track-link" className="field-label">Link <span className="muted">(YouTube, Bandcamp...)</span></label>
                                <input id="track-link" type="url" inputMode="url" className="field" value={track.link}
                                    onChange={setTrackField('link')} placeholder="https://www.youtube.com/watch?v=…" />
                            </div>
                            <div>
                                <label htmlFor="track-year" className="field-label">Year</label>
                                <input id="track-year" inputMode="numeric" className="field" value={track.year} onChange={setTrackField('year')} placeholder="1975" />
                            </div>
                        </div>
                    </fieldset>
                )}

                <div>
                    <label htmlFor="feedback-message" className="field-label">
                        Message <span className="muted">({message.length} / {MAX_MESSAGE})</span>
                    </label>
                    <textarea
                        id="feedback-message"
                        rows={6}
                        maxLength={MAX_MESSAGE}
                        value={message}
                        onChange={(e) => { setMessage(e.target.value); setError('') }}
                        placeholder={offered && about
                            ? 'Optional: why it belongs here, which genre it fits...'
                            : kind === 'CORRECTION'
                            ? 'e.g. Fungus Funk plays night full-on, not forest. Source: their Sangoma releases.'
                            : 'Tell us what you think...'}
                        className="field"
                    />
                </div>

                <div>
                    <label htmlFor="feedback-email" className="field-label">Email <span className="muted">(optional, if you want an answer)</span></label>
                    <input id="feedback-email" type="email" autoComplete="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} className="field" />
                </div>

                {/* Hidden from people and screen readers; only bots fill it in */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                    <label htmlFor="feedback-website">Website</label>
                    <input id="feedback-website" type="text" tabIndex={-1} autoComplete="off"
                        value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>

                {error && <p className="notice m-0" role="alert">{error}</p>}

                <button type="submit" disabled={sending} className="btn btn--primary justify-self-start">
                    {sending ? 'Sending...' : 'Send feedback'}
                </button>
            </form>
        </div>
    )
}

export default Feedback
