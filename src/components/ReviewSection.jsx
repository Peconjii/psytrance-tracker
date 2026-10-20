import { useState, useEffect } from 'react'
import { fetchEventReviews, submitEventReview } from '../api/backend'
import { useAuth } from '../context/AuthContext'

function ReviewSection({ eventId }) {
    const { user } = useAuth()
    const [reviews, setReviews] = useState([])
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        async function loadReviews() {
            setLoading(true)
            const data = await fetchEventReviews(eventId)
            setReviews(data)
            setLoading(false)
        }
        if (eventId) {
            loadReviews()
        }
    }, [eventId])

    async function handleSubmit(e) {
        e.preventDefault()
        setSubmitting(true)
        try {
            const updatedReview = await submitEventReview(eventId, rating, comment)
            setReviews(prev => {
                const filtered = prev.filter(r => r.username !== updatedReview.username)
                return [updatedReview, ...filtered]
            })
            setComment('')
        } catch (err) {
            console.error("Failed to submit review:", err)
        } finally {
            setSubmitting(false)
        }
    }

    const averageRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null

    return (
        <section className="panel">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 className="panel__label m-0">Reviews</h2>
                {averageRating && (
                    <span className="mono text-xs soft">★ {averageRating} / 5 · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
                )}
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="mb-4 grid gap-2">
                    <div className="flex items-center gap-3">
                        <label htmlFor={`rating-${eventId}`} className="field-label m-0">Rating</label>
                        <select
                            id={`rating-${eventId}`}
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="field w-auto py-1"
                        >
                            {[5, 4, 3, 2, 1].map(n => (
                                <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n})</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        placeholder="How was it?"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={2}
                        className="field"
                    />

                    <button type="submit" disabled={submitting} className="btn btn--primary justify-self-end">
                        {submitting ? 'Posting...' : 'Post review'}
                    </button>
                </form>
            ) : (
                <p className="muted text-sm mb-3">Log in to leave a review.</p>
            )}

            {loading ? (
                <p className="muted text-sm">Loading reviews...</p>
            ) : reviews.length === 0 ? (
                <p className="muted text-sm">No reviews yet.</p>
            ) : (
                <ul className="rows max-h-64 overflow-y-auto">
                    {reviews.map(rev => (
                        <li key={rev.id} className="rows__item flex-col items-stretch gap-1">
                            <div className="flex justify-between gap-3">
                                <span className="mono text-xs text-[var(--accent)]">{rev.username}</span>
                                <span className="mono text-xs soft">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                            </div>
                            {rev.comment && <p className="soft text-sm m-0">{rev.comment}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default ReviewSection