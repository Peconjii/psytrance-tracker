import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteReview, fetchNewestReviews } from '../api/backend.js'
import AdminTabs from '../components/AdminTabs'
import usePageMeta from '../hooks/usePageMeta.js'

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Admin panel: the newest reviews of the whole site, to catch spam and insults. A deleted review is in the history.
function AdminReviews() {
    usePageMeta({ title: 'Reviews', path: '/admin/reviews', noindex: true })
    const [reviews, setReviews] = useState(null)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState(null)

    useEffect(() => {
        const controller = new AbortController()
        fetchNewestReviews(controller.signal)
            .then(setReviews)
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Could not load the reviews.') })
        return () => controller.abort()
    }, [])

    const remove = async (review) => {
        if (!window.confirm(`Delete this review by @${review.username}?`)) return
        setDeleting(review.id)
        setError('')
        try {
            await deleteReview(review.id)
            setReviews(list => list.filter(r => r.id !== review.id))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not delete. Try again.')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="page">
            <AdminTabs />
            <header className="page-head">
                <div className="page-head__tag">// Admin · crew talk</div>
                <h1 className="page-title">Reviews</h1>
                <p className="page-head__sub">The newest 100 reviews. Delete spam or insults; the history keeps what they said.</p>
            </header>
            {error && <p className="notice">{error}</p>}
            {!reviews ? (
                <p className="mono text-xs muted">Loading…</p>
            ) : reviews.length === 0 ? (
                <div className="empty"><p><strong>No reviews yet.</strong></p></div>
            ) : (
                <ul className="rows panel">
                    {reviews.map(r => (
                        <li key={r.id} className="rows__item flex flex-wrap items-start gap-3">
                            <span className="min-w-0 flex-1">
                                <span className="mono text-xs text-[var(--accent)]">@{r.username}</span>
                                <span className="mono text-xs soft ml-2">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                                <span className="mono text-xs muted ml-2">{r.createdAt ? WHEN.format(new Date(r.createdAt)) : ''}</span>
                                {r.comment ? <p className="soft text-sm m-0 mt-1">{r.comment}</p> : <p className="muted text-sm m-0 mt-1">No comment</p>}
                            </span>
                            <Link className="link mono text-xs" to={`/events/${r.eventId}`}>Event →</Link>
                            <button type="button" className="btn btn--ghost btn--danger" disabled={deleting === r.id}
                                onClick={() => remove(r)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default AdminReviews
