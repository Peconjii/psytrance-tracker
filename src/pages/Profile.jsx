import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FavoritesContext } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import api, { fetchMyGoing, setEventReminders } from '../api/backend'

// "2026-10-14" in the browser's time zone, to compare with the dates the backend sends
function todayIso() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function Profile() {
    const { user, updateUser } = useAuth()
    const { favorites } = useContext(FavoritesContext)
    const [userReviews, setUserReviews] = useState([])
    const [loadingReviews, setLoadingReviews] = useState(true)
    const [going, setGoing] = useState({ userId: null, items: [] })
    const [savingReminders, setSavingReminders] = useState(false)
    const [remindersError, setRemindersError] = useState(null)

    const goingLoaded = Boolean(user) && going.userId === user.id
    const today = todayIso()
    // Events without a date are kept, since they might still be coming up
    const upcomingGoing = goingLoaded ? going.items.filter(item => !item.startsOn || item.startsOn >= today) : []
    const remindersOn = user?.eventReminders !== false

    useEffect(() => {
        if (!user?.id) return
        fetchMyGoing()
            .then(items => setGoing({ userId: user.id, items }))
            .catch(err => {
                console.error('Error fetching events you are going to:', err)
                setGoing({ userId: user.id, items: [] })
            })
    }, [user?.id])

    const toggleReminders = async () => {
        setSavingReminders(true)
        setRemindersError(null)
        try {
            updateUser({ eventReminders: await setEventReminders(!remindersOn) })
        } catch (err) {
            console.error('Could not change reminder setting:', err)
            setRemindersError('Could not save the setting. Please try again.')
        } finally {
            setSavingReminders(false)
        }
    }

    // Keep ratings within 0-5, because String.repeat throws a RangeError for negative counts
    const clampRating = (value) => Math.max(0, Math.min(5, Math.round(Number(value) || 0)))

    // Keyed on the id, not the user object, so changing a setting doesn't reload the reviews
    const userId = user?.id
    useEffect(() => {
        async function fetchUserReviews() {
            if (!userId) {
                setLoadingReviews(false)
                return
            }
            setLoadingReviews(true)
            try {
                const response = await api.get('/api/reviews/user')
                setUserReviews(response.data || [])
            } catch (err) {
                console.error("Error fetching user reviews:", err)
            } finally {
                setLoadingReviews(false)
            }
        }
        fetchUserReviews()
    }, [userId])

    // Calculate top location based on favorites
    const locationCounts = favorites.reduce((acc, fav) => {
        const location = fav.eventName ? fav.eventName.split('-')[0].trim() : 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
    }, {});

    const topLocation = Object.keys(locationCounts).length > 0
        ? Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b)
        : 'N/A';

    // Calculate average rating submitted by user
    const averageRating = userReviews.length > 0
        ? (userReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / userReviews.length).toFixed(1)
        : '0.0';

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            
            {/* Page Header */}
            <div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
                    User Profile & Dashboard
                </h1>
                <p className="text-slate-400 text-sm mt-1">Manage your account stats and community reviews</p>
            </div>
            
            {/* Account Info Header - Glassmorphism Style */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <span className="text-cyan-400 text-xs font-semibold uppercase tracking-widest block">Account Info</span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{user?.username || 'Guest User'}</h2>
                    <p className="text-slate-400 text-sm">{user?.email || 'No email associated'}</p>
                </div>
                <div className="space-y-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <span className="text-sm text-slate-300">Email reminders</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={remindersOn}
                            onClick={toggleReminders}
                            disabled={savingReminders}
                            className={`relative w-11 h-6 rounded-full border transition-colors cursor-pointer disabled:opacity-60 ${
                                remindersOn ? 'bg-cyan-500/40 border-cyan-400/60' : 'bg-slate-800 border-slate-700'
                            }`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${remindersOn ? 'translate-x-5' : ''}`} />
                        </button>
                    </label>
                    <p className={`text-xs max-w-xs ${remindersError ? 'text-red-400' : 'text-slate-500'}`}>
                        {remindersError || 'An email 3 days before events you saved or are going to.'}
                    </p>
                </div>
            </div>

            {/* Dashboard Statistics Grid */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    ⚡ Your Activity Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 p-6 rounded-2xl text-center shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-400/60 transition-all">
                        <span className="text-4xl font-extrabold text-cyan-400 block mb-1 drop-shadow">{favorites.length}</span>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Saved Events</span>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-purple-500/30 p-6 rounded-2xl text-center shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:border-purple-400/60 transition-all">
                        <span className="text-4xl font-extrabold text-purple-400 block mb-1 drop-shadow">{userReviews.length}</span>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reviews Left</span>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/30 p-6 rounded-2xl text-center shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-400/60 transition-all">
                        <span className="text-4xl font-extrabold text-amber-400 block mb-1 drop-shadow">⭐ {averageRating}</span>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg Rating</span>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 p-6 rounded-2xl text-center shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-400/60 transition-all">
                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 block mb-1 truncate px-2 drop-shadow">{topLocation}</span>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Top Location</span>
                    </div>

                </div>
            </div>

            {/* Events the user marked "I'm going" */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_25px_rgba(16,185,129,0.12)]">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    ✓ You're Going To ({upcomingGoing.length})
                </h3>

                {!goingLoaded ? (
                    <p className="text-cyan-400 text-sm animate-pulse">Loading your events...</p>
                ) : upcomingGoing.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800">
                        <p className="text-slate-300 text-sm font-medium">No upcoming events yet.</p>
                        <p className="text-slate-500 text-xs mt-1">
                            Press "I'm going" on an <Link to="/events" className="text-cyan-400 hover:text-cyan-300">event</Link> to see it here.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {upcomingGoing.map(item => (
                            <li key={item.eventId}>
                                <Link
                                    to={`/events/${item.eventId}`}
                                    className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center gap-4 hover:border-emerald-500/40 transition-all group"
                                >
                                    <span className="text-slate-200 text-sm font-semibold group-hover:text-emerald-300 truncate">{item.eventName}</span>
                                    <span className="text-purple-300 text-xs font-semibold whitespace-nowrap">📅 {item.startsOn || 'Date TBA'}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* User Submitted Reviews Section */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    💬 Your Written Reviews ({userReviews.length})
                </h3>

                {loadingReviews ? (
                    <p className="text-cyan-400 text-sm animate-pulse">Loading your reviews...</p>
                ) : userReviews.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800">
                        <p className="text-slate-300 text-sm font-medium">You haven't left any reviews yet.</p>
                        <p className="text-slate-500 text-xs mt-1">Explore events and share your feedback with the community!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {userReviews.map(review => (
                            <div 
                                key={review.id} 
                                className="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-500/30 transition-all"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-amber-400 text-sm font-bold tracking-widest">
                                            {'★'.repeat(clampRating(review.rating))}{'☆'.repeat(5 - clampRating(review.rating))}
                                        </span>
                                        <span className="text-slate-400 text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                            Event ID: #{review.eventId}
                                        </span>
                                    </div>
                                    <p className="text-slate-200 text-sm font-light">{review.comment}</p>
                                </div>
                                <span className="text-slate-500 text-xs whitespace-nowrap self-end md:self-center">
                                    {review.createdAt ? review.createdAt.split('T')[0] : 'Recent'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Profile