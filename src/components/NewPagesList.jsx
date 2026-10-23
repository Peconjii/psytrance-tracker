import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNewPages } from '../api/backend.js'

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

// Pages people made themselves that have no upcoming event yet: the lists above only know the line-ups, so this is
// where a new artist or crew is found. kind: 'artists' | 'organizers'; keep: an optional filter (the role chips);
// onCount: told how many show, so the list above can drop its "nothing found" when these match.
function NewPagesList({ kind, search, keep, meta, onCount }) {
    const [pages, setPages] = useState([])

    useEffect(() => {
        const controller = new AbortController()
        fetchNewPages(kind, search, controller.signal)
            .then(setPages)
            .catch(() => { if (!controller.signal.aborted) setPages([]) })
        return () => controller.abort()
    }, [kind, search])

    const shown = keep ? pages.filter(keep) : pages
    useEffect(() => { onCount?.(shown.length) }, [onCount, shown.length])
    if (shown.length === 0) return null

    return (
        <section className="mt-8">
            <h2 className="panel__label">New on Map of Psy · no gigs yet · {shown.length}</h2>
            <ul className="rows md:columns-2 md:gap-8">
                {shown.map(page => (
                    <li key={page.slug} className="break-inside-avoid">
                        <Link to={`/${kind}/${encodeURIComponent(page.slug)}`} state={{ name: page.name }} className="rows__item">
                            <span className="flex items-center gap-3 min-w-0">
                                {page.photoUrl
                                    ? <img className="rows__thumb" src={page.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                                    : <span className="rows__thumb rows__thumb--initials" aria-hidden="true">{initials(page.name)}</span>}
                                <span className="rows__name">{page.name}</span>
                            </span>
                            <span className="rows__meta">{meta ? meta(page) : 'new'}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default NewPagesList
