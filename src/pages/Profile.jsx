import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FavoritesContext } from '../context/FavoritesContext'
import { useAuth } from '../context/AuthContext'
import { useFollows } from '../context/FollowsContext'
import FollowButton from '../components/FollowButton.jsx'
import api, { fetchMyArtists, fetchMyGoing, fetchMyOrganizers, setEventReminders } from '../api/backend'
import usePageMeta from '../hooks/usePageMeta.js'

// "2026-10-14" in the browser's time zone, to compare with the dates the backend sends
function todayIso() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function Profile() {
    usePageMeta({ title: 'Profile', path: '/profile', noindex: true })
    const { user, updateUser } = useAuth()
    const { follows } = useFollows()
    // Artist profiles this account owns (an admin linked them)
    const [myArtists, setMyArtists] = useState([])
    // Organizer pages this account owns
    const [myOrganizers, setMyOrganizers] = useState([])
    useEffect(() => {
        const controller = new AbortController()
        fetchMyArtists(controller.signal).then(setMyArtists).catch(() => {})
        fetchMyOrganizers(controller.signal).then(setMyOrganizers).catch(() => {})
        return () => controller.abort()
    }, [])
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
        <div className="page grid gap-6">
            <header className="page-head m-0">
                <div className="page-head__tag">// Crew member</div>
                <h1 className="page-title">{user?.username || 'Profile'}</h1>
                <p className="page-head__sub">{user?.email || 'No email associated'}</p>
            </header>

            <section className="panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="panel__label">Emails</h2>
                    <p className={`text-sm m-0 max-w-md ${remindersError ? 'text-[var(--danger)]' : 'muted'}`}>
                        {remindersError || 'An email 3 days before events you saved or are going to, and when an artist you follow gets a new gig.'}
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={remindersOn}
                    aria-label="Email reminders"
                    onClick={toggleReminders}
                    disabled={savingReminders}
                    className="switch shrink-0"
                />
            </section>

            <section>
                <h2 className="panel__label">Activity</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="stat">
                        <span className="stat__value">{favorites.length}</span>
                        <span className="stat__label">Saved events</span>
                    </div>
                    <div className="stat" style={{ '--fam': 'var(--dark)' }}>
                        <span className="stat__value">{userReviews.length}</span>
                        <span className="stat__label">Reviews</span>
                    </div>
                    <div className="stat" style={{ '--fam': 'var(--gold)' }}>
                        <span className="stat__value">★ {averageRating}</span>
                        <span className="stat__label">Average rating</span>
                    </div>
                    <div className="stat" style={{ '--fam': 'var(--goa)' }}>
                        <span className="stat__value" title={topLocation}>{topLocation}</span>
                        <span className="stat__label">Top location</span>
                    </div>
                </div>
            </section>

            {myArtists.length > 0 && (
                <section className="panel">
                    <h2 className="panel__label">Your artist profile</h2>
                    <ul className="rows">
                        {myArtists.map(a => (
                            <li key={a.slug} className="rows__item">
                                <Link className="rows__name link" to={`/artists/${encodeURIComponent(a.slug)}`}>{a.name}</Link>
                                <Link className="btn" to={`/artists/${encodeURIComponent(a.slug)}/edit`}>✎ Edit profile</Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {myOrganizers.length > 0 && (
                <section className="panel">
                    <h2 className="panel__label">Your organizer page</h2>
                    <ul className="rows">
                        {myOrganizers.map(o => (
                            <li key={o.slug} className="rows__item">
                                <Link className="rows__name link" to={`/organizers/${encodeURIComponent(o.slug)}`}>{o.name}</Link>
                                <Link className="btn" to={`/organizers/${encodeURIComponent(o.slug)}/edit`}>✎ Edit page</Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="panel">
                <h2 className="panel__label">Artists you follow · {follows.length}</h2>
                {follows.length === 0 ? (
                    <div className="empty">
                        <p><strong>You don't follow anyone yet.</strong></p>
                        <p>Press "☆ Follow" on an <Link to="/artists" className="link">artist's page</Link>: their ships glow gold on the map.</p>
                    </div>
                ) : (
                    <ul className="rows">
                        {follows.map(f => (
                            <li key={f.slug} className="rows__item">
                                <Link to={`/artists/${encodeURIComponent(f.slug)}`} state={{ name: f.name }} className="rows__name link">{f.name}</Link>
                                <FollowButton slug={f.slug} name={f.name} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="panel">
                <h2 className="panel__label">You're going to · {upcomingGoing.length}</h2>

                {!goingLoaded ? (
                    <p className="muted text-sm m-0">Loading your events...</p>
                ) : upcomingGoing.length === 0 ? (
                    <div className="empty">
                        <p><strong>No upcoming events yet.</strong></p>
                        <p>Press "I'm going" on an <Link to="/events" className="link">event</Link> to see it here.</p>
                    </div>
                ) : (
                    <ul className="rows">
                        {upcomingGoing.map(item => (
                            <li key={item.eventId}>
                                <Link to={`/events/${item.eventId}`} className="rows__item">
                                    <span className="rows__name">{item.eventName}</span>
                                    <span className="rows__meta">{item.startsOn || 'Date TBA'}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="panel">
                <h2 className="panel__label">Your reviews · {userReviews.length}</h2>

                {loadingReviews ? (
                    <p className="muted text-sm m-0">Loading your reviews...</p>
                ) : userReviews.length === 0 ? (
                    <div className="empty">
                        <p><strong>You haven't left any reviews yet.</strong></p>
                        <p>Reviews are on each event's page.</p>
                    </div>
                ) : (
                    <ul className="rows">
                        {userReviews.map(review => (
                            <li key={review.id}>
                                <Link to={`/events/${review.eventId}`} className="rows__item flex-col items-stretch gap-1">
                                    <span className="flex justify-between gap-3">
                                        <span className="mono text-xs soft">
                                            {'★'.repeat(clampRating(review.rating))}{'☆'.repeat(5 - clampRating(review.rating))}
                                        </span>
                                        <span className="rows__meta">
                                            {review.createdAt ? review.createdAt.split('T')[0] : 'Recent'} · event #{review.eventId}
                                        </span>
                                    </span>
                                    {review.comment && <span className="soft text-sm">{review.comment}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

export default Profile