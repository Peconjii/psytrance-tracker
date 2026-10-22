import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import {
    fetchFollowedGigs, fetchFollows, fetchLabelFollows, followArtist, followLabel, unfollowArtist, unfollowLabel,
} from '../api/backend.js'

const FollowsContext = createContext()

// All lists in one go: the artists and labels followed, and the upcoming events where their artists play
async function loadAll(signal) {
    const [follows, labels, gigs] = await Promise.all([fetchFollows(signal), fetchLabelFollows(signal), fetchFollowedGigs(signal)])
    return { follows, labels, gigsByEvent: new Map(gigs.map(g => [g.eventId, g.artists])) }
}

const NONE = { follows: [], labels: [], gigsByEvent: new Map() }

// The artists and labels the logged-in user follows, and the events where those artists play (ships with a halo
// on the map). Loaded once per login; following or unfollowing loads everything again.
export function FollowsProvider({ children }) {
    const { user, token } = useAuth()
    // Remember whose follows were loaded, so after logout/login another user's list is never shown
    const [loaded, setLoaded] = useState({ userId: null, ...NONE })
    const { follows, labels, gigsByEvent } = user?.id && token && loaded.userId === user.id ? loaded : NONE

    useEffect(() => {
        if (!user?.id || !token) return
        const controller = new AbortController()
        loadAll(controller.signal)
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
        setLoaded({ userId, ...await loadAll() })
    }

    const isFollowingLabel = (label) => labels.includes(label)

    async function toggleLabel(label) {
        if (isFollowingLabel(label)) await unfollowLabel(label)
        else await followLabel(label)
        const userId = user.id
        setLoaded({ userId, ...await loadAll() })
    }

    return (
        <FollowsContext.Provider value={{ follows, labels, gigsByEvent, isFollowing, toggleFollow, isFollowingLabel, toggleLabel }}>
            {children}
        </FollowsContext.Provider>
    )
}

export function useFollows() {
    return useContext(FollowsContext)
}
