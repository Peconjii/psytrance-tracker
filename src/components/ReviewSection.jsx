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
        <div className="bg-gray-800 p-4 rounded-xl mt-3 text-white text-left">
            <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                <h3 className="font-bold text-lg">User Reviews</h3>
                {averageRating && (
                    <span className="bg-purple-900 text-purple-200 text-sm px-2.5 py-1 rounded-full font-semibold">
                        ★ {averageRating} / 5 ({reviews.length})
                    </span>
                )}
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">Rating:</label>
                        <select
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="bg-gray-700 text-white rounded px-2 py-1 focus:outline-none"
                        >
                            <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                            <option value={4}>⭐⭐⭐⭐ (4)</option>
                            <option value={3}>⭐⭐⭐ (3)</option>
                            <option value={2}>⭐⭐ (2)</option>
                            <option value={1}>⭐ (1)</option>
                        </select>
                    </div>

                    <textarea
                        placeholder="Write a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-700 text-white p-2 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-400 border border-transparent"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="self-end bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Post Review'}
                    </button>
                </form>
            ) : (
                <p className="text-xs text-gray-400 italic mb-3">Login to leave a review.</p>
            )}

            {loading ? (
                <p className="text-xs text-gray-400">Loading reviews...</p>
            ) : reviews.length === 0 ? (
                <p className="text-xs text-gray-400">No reviews yet. Be the first!</p>
            ) : (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {reviews.map(rev => (
                        <div key={rev.id} className="bg-gray-700 p-2 rounded-lg text-xs">
                            <div className="flex justify-between text-gray-300 mb-1">
                                <span className="font-semibold text-cyan-300">{rev.username}</span>
                                <span>{'★'.repeat(rev.rating)}</span>
                            </div>
                            {rev.comment && <p className="text-gray-200">{rev.comment}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ReviewSection