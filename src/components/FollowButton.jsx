import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFollows } from '../context/FollowsContext'

// "☆ Follow" an artist (slug) or a label of the map (label): their ships get a halo on the map and new gigs come
// by email. Guests are sent to log in.
/** @param {{ slug?: string | null, label?: string | null, name: string, className?: string }} props */
function FollowButton({ slug = null, label = null, name, className = 'btn' }) {
    const { user } = useAuth()
    const { isFollowing, toggleFollow, isFollowingLabel, toggleLabel } = useFollows()
    const location = useLocation()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    if (!user) {
        return (
            <Link className={className} to="/login" state={{ from: location.pathname }} title={`Log in to follow ${name}`}>
                ☆ Follow
            </Link>
        )
    }

    const following = label ? isFollowingLabel(label) : isFollowing(slug)
    const toggle = async () => {
        setBusy(true)
        setError('')
        try {
            await (label ? toggleLabel(label) : toggleFollow(slug))
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save. Try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <button className={`${className}${following ? ' is-on' : ''}`} onClick={toggle} disabled={busy} aria-pressed={following}
                title={following ? `Stop following ${name}` : label
                    ? `Ships of ${name}'s artists get a halo on the map, and an email when one of them gets a new gig`
                    : `Ships get a halo on the map, and an email when ${name} gets a new gig`}>
                {following ? '★ Following' : '☆ Follow'}
            </button>
            {error && <span className="notice m-0">{error}</span>}
        </>
    )
}

export default FollowButton
