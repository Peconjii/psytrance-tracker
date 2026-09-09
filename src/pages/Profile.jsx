import { useContext, useEffect, useState } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/backend'

function Profile() {
    const { user } = useAuth()
    const { favorites } = useContext(FavoritesContext)
    const [userReviews, setUserReviews] = useState([])
    const [loadingReviews, setLoadingReviews] = useState(true)

    // Fetch user reviews with fallbacks for existing endpoints
    useEffect(() => {
        async function fetchUserReviews() {
            if (!user) return;
            try {
                const response = await api.get('/api/reviews/user')
                setUserReviews(response.data || [])
            } catch (err) {
                try {
                    const fallbackResponse = await api.get('/api/reviews')
                    const allReviews = fallbackResponse.data || []
                    const filtered = allReviews.filter(r => 
                        r.username === user.username || 
                        r.userId === user.id || 
                        String(r.userId) === String(user.id)
                    )
                    setUserReviews(filtered)
                } catch (fallbackErr) {
                    console.error("Error fetching user reviews fallback:", fallbackErr)
                }
            } finally {
                setLoadingReviews(false)
            }
        }
        fetchUserReviews()
    }, [user])

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
                <div className="bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    ✦ Active Account
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
                                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
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