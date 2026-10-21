import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFollows } from '../context/FollowsContext'

// "☆ Follow" an artist: their ships glow gold on the map and new gigs come by email. Guests are sent to log in.
function FollowButton({ slug, name }) {
    const { user } = useAuth()
    const { isFollowing, toggleFollow } = useFollows()
    const location = useLocation()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    if (!user) {
        return (
            <Link className="btn" to="/login" state={{ from: location.pathname }} title={`Log in to follow ${name}`}>
                ☆ Follow
            </Link>
        )
    }

    const following = isFollowing(slug)
    const toggle = async () => {
        setBusy(true)
        setError('')
        try {
            await toggleFollow(slug)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <button className={`btn${following ? ' is-on' : ''}`} onClick={toggle} disabled={busy} aria-pressed={following}
                title={following ? `Stop following ${name}` : `Gold ships on the map and an email when ${name} gets a new gig`}>
                {following ? '★ Following' : '☆ Follow'}
            </button>
            {error && <span className="notice m-0">{error}</span>}
        </>
    )
}

export default FollowButton
