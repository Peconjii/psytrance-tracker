import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { fetchFollowedGigs, fetchFollows, followArtist, unfollowArtist } from '../api/backend.js'

const FollowsContext = createContext()

// Both lists in one go: the artists followed, and the upcoming events where they play
async function loadBoth(signal) {
    const [follows, gigs] = await Promise.all([fetchFollows(signal), fetchFollowedGigs(signal)])
    return { follows, gigsByEvent: new Map(gigs.map(g => [g.eventId, g.artists])) }
}

const NONE = { follows: [], gigsByEvent: new Map() }

// The artists the logged-in user follows, and the events where they play (gold ships on the map).
// Loaded once per login; following or unfollowing loads both again.
export function FollowsProvider({ children }) {
    const { user, token } = useAuth()
    // Remember whose follows were loaded, so after logout/login another user's list is never shown
    const [loaded, setLoaded] = useState({ userId: null, ...NONE })
    const { follows, gigsByEvent } = user?.id && token && loaded.userId === user.id ? loaded : NONE

    useEffect(() => {
        if (!user?.id || !token) return
        const controller = new AbortController()
        loadBoth(controller.signal)
            .then(found => setLoaded({ userId: user.id, ...found }))
            .catch(err => { if (!controller.signal.aborted) console.error('Failed to fetch followed artists:', err) })
        return () => controller.abort()
    }, [user?.id, token])

    const isFollowing = (slug) => follows.some(f => f.slug === slug)

    // Throws on failure, so the button can say so
    async function toggleFollow(slug) {
        if (isFollowing(slug)) await unfollowArtist(slug)
        else await followArtist(slug)
        const userId = user.id
        setLoaded({ userId, ...await loadBoth() })
    }

    return (
        <FollowsContext.Provider value={{ follows, gigsByEvent, isFollowing, toggleFollow }}>
            {children}
        </FollowsContext.Provider>
    )
}

export function useFollows() {
    return useContext(FollowsContext)
}
