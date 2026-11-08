import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sendFeedback } from '../api/backend.js'
import usePageMeta from '../hooks/usePageMeta.js'
import { isSitePath } from '../components/sitePath.js'
import { data } from '../map/data/types'
import YouTubeCheck from '../components/YouTubeCheck.jsx'
import { cleanYouTubeLink } from '../utils/youtube.js'

const KINDS = [
    { value: 'CORRECTION', label: 'Correct the data', hint: 'A genre, artist, festival or event is wrong or missing' },
    { value: 'COMPLAINT', label: 'Something is broken', hint: 'A page, button or the map does not work as it should' },
    { value: 'SUGGESTION', label: 'Improvement', hint: 'Something that would make the site better' },
    { value: 'IDEA', label: 'Idea', hint: 'A new feature, a crazy one is fine' },
    { value: 'OTHER', label: 'Other', hint: 'Anything else' },
]
const ABOUT_LABELS = { GENRE: 'Genre', ARTIST: 'Artist', EVENT: 'Event', FESTIVAL: 'Festival', LABEL: 'Label', PAGE: 'Page' }
const MAX_MESSAGE = 2000
// Read each time: genres admins added to the galaxy join after the site loads
const genreNames = () => data.genres.map(g => g.name).sort((a, b) => a.localeCompare(b))
// What an event correction is about. A genre the inbox can set with one click; the rest comes from Goabase
const EVENT_FIELDS = [
    { value: 'genre', label: 'Genre' },
    { value: 'date', label: 'Date' },
    { value: 'place', label: 'Place' },
    { value: 'name', label: 'Name' },
    { value: 'other', label: 'Something else' },
]

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
    // "+ Suggest a genre" on the galaxy: a genre the map doesn't have yet
    const newGenre = params.get('newgenre') === '1'
    const [genre, setGenre] = useState({ name: '', from: '', year: '', artists: '', link: '' })
    const setGenreField = (field) => (e) => { setGenre(g => ({ ...g, [field]: field === 'link' ? cleanYouTubeLink(e.target.value) : e.target.value })); setError('') }
    // A correction of an event: which field is wrong and what is right
    const [fix, setFix] = useState({ field: 'genre', genres: [], value: '' })
    const setTrackField = (field) => (e) => { setTrack(t => ({ ...t, [field]: field === 'link' ? cleanYouTubeLink(e.target.value) : e.target.value })); setError('') }
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
        const eventFix = about?.type === 'EVENT' && kind === 'CORRECTION'
        if (newGenre && !about && genre.name.trim().length < 2) {
            return setError('Write the name of the genre.')
        }
        if (newGenre && !about && genre.link.trim() && !/^https?:\/\/\S+$/.test(genre.link.trim())) {
            return setError('The link should start with https:// (YouTube, Bandcamp, SoundCloud...).')
        }
        if (suggestion && track.title.trim().length < 2) {
            return setError(suggestion === 'track' ? 'Write the name of the track.' : 'Write the name of the artist.')
        }
        if (suggestion && track.link.trim() && !/^https?:\/\/\S+$/.test(track.link.trim())) {
            return setError('The link should start with https:// (YouTube, Bandcamp, SoundCloud...).')
        }
        // Only what the chosen field shows counts: genres picked before switching to "Date" don't
        const filled = (newGenre && !about) || (eventFix && (fix.field === 'genre' ? fix.genres.length > 0 : Boolean(fix.value.trim())))
        if (!suggestion && !filled && message.trim().length < 5) {
            return setError('Write a few more words, so we know what to fix.')
        }
        const text = newGenre && !about
            ? [`Genre suggestion: "${genre.name.trim()}"`,
                genre.from.trim() && `Grew out of: ${genre.from.trim()}`,
                genre.year.trim() && `Since: ${genre.year.trim()}`,
                genre.artists.trim() && `Artists: ${genre.artists.trim()}`,
                genre.link.trim() && `Example: ${genre.link.trim()}`, message.trim()].filter(Boolean).join('\n')
            : eventFix && fix.field === 'genre' && fix.genres.length > 0
            ? [`Event correction · genre: "${fix.genres.join(', ')}"`, message.trim()].filter(Boolean).join('\n')
            : eventFix && fix.field !== 'genre' && fix.value.trim()
            ? [`Event correction · ${fix.field}: "${fix.value.trim()}"`, message.trim()].filter(Boolean).join('\n')
            : suggestion
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
                {/* The other ways to add to the map, the same buttons the galaxy and the pages have */}
                <nav className="flex flex-wrap gap-2 mt-4" aria-label="Other ways to help">
                    <Link className="chip no-underline" to="/new-page"
                        title="An artist, label, festival or crew that isn't on the map yet? Ask for your page">+ Not on the map? Add yourself</Link>
                    {!(newGenre && !about) && (
                        <Link className="chip no-underline" to={`/feedback?${new URLSearchParams({ kind: 'SUGGESTION', newgenre: '1', ...(from ? { from } : {}) })}`}
                            onClick={() => { setAbout(null); setKind('SUGGESTION') }}
                            title="Know a style that has no star yet? Tell us">+ Suggest a genre</Link>
                    )}
                    <Link className="chip no-underline" to="/events/new" title="A party or festival that isn't listed yet">+ Add an event</Link>
                    <Link className="chip no-underline" to="/"
                        title="Open a star (genre) or an artist on the galaxy: the panel has + Suggest an artist and + Suggest a track">
                        ✦ Suggest a track or artist
                    </Link>
                </nav>
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

                {newGenre && !about && (
                    <fieldset className="grid gap-3 m-0 p-0 border-0">
                        <legend className="field-label">A genre the map is missing</legend>
                        <div>
                            <label htmlFor="genre-name" className="field-label">Name</label>
                            <input id="genre-name" className="field" value={genre.name} onChange={setGenreField('name')}
                                placeholder="e.g. Psybient" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                                <label htmlFor="genre-from" className="field-label">Grew out of <span className="muted">(optional)</span></label>
                                <input id="genre-from" className="field" list="genre-names" value={genre.from}
                                    onChange={setGenreField('from')} placeholder="e.g. Goa trance and ambient" />
                                <datalist id="genre-names">{genreNames().map(n => <option key={n} value={n} />)}</datalist>
                            </div>
                            <div>
                                <label htmlFor="genre-year" className="field-label">Since <span className="muted">(year)</span></label>
                                <input id="genre-year" inputMode="numeric" className="field" value={genre.year} onChange={setGenreField('year')} placeholder="1995" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="genre-artists" className="field-label">A few artists <span className="muted">(optional)</span></label>
                            <input id="genre-artists" className="field" value={genre.artists} onChange={setGenreField('artists')}
                                placeholder="e.g. Shpongle, Ott, Entheogenic" />
                        </div>
                        <div>
                            <label htmlFor="genre-link" className="field-label">A track that shows it <span className="muted">(link, optional)</span></label>
                            <input id="genre-link" type="url" inputMode="url" className="field" value={genre.link}
                                onChange={setGenreField('link')} placeholder="https://www.youtube.com/watch?v=…" />
                            <YouTubeCheck value={genre.link} />
                        </div>
                    </fieldset>
                )}

                {about?.type === 'EVENT' && kind === 'CORRECTION' && (
                    <fieldset className="grid gap-3 m-0 p-0 border-0">
                        <legend className="field-label">What is wrong?</legend>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What is wrong">
                            {EVENT_FIELDS.map(f => (
                                <button key={f.value} type="button" role="radio" aria-checked={fix.field === f.value}
                                    className={`chip${fix.field === f.value ? ' is-on' : ''}`}
                                    onClick={() => { setFix(x => ({ ...x, field: f.value })); setError('') }}>{f.label}</button>
                            ))}
                        </div>
                        {fix.field === 'genre' ? (
                            <div>
                                <label htmlFor="fix-genre" className="field-label">The right genre <span className="muted">(one or more)</span></label>
                                <select id="fix-genre" className="field" value=""
                                    onChange={(e) => { const g = e.target.value; if (g) setFix(x => ({ ...x, genres: x.genres.includes(g) ? x.genres : [...x.genres, g].slice(0, 4) })) }}>
                                    <option value="">Pick a genre…</option>
                                    {genreNames().map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                {fix.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {fix.genres.map(g => (
                                            <button key={g} type="button" className="chip is-on" aria-label={`Remove ${g}`}
                                                onClick={() => setFix(x => ({ ...x, genres: x.genres.filter(y => y !== g) }))}>{g} ✕</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : fix.field !== 'other' && (
                            <div>
                                <label htmlFor="fix-value" className="field-label">What is right</label>
                                <input id="fix-value" className="field" value={fix.value}
                                    onChange={(e) => { setFix(x => ({ ...x, value: e.target.value })); setError('') }}
                                    placeholder={fix.field === 'date' ? 'e.g. 12–14 June 2027' : fix.field === 'place' ? 'e.g. Lisbon, Portugal' : 'The right name'} />
                            </div>
                        )}
                    </fieldset>
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
                                <YouTubeCheck value={track.link} />
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
                        placeholder={(offered && about) || (newGenre && !about) || (about?.type === 'EVENT' && kind === 'CORRECTION')
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
