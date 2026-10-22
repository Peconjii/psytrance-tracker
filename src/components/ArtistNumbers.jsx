import { useEffect, useState } from 'react'
import { fetchArtistStats } from '../api/backend.js'
import GigStats from './GigStats.jsx'

// The "Numbers" panel of an artist's page; nothing until there is at least one gig or follower to count
function ArtistNumbers({ slug }) {
    const [loaded, setLoaded] = useState({ slug: null, stats: null })
    const stats = loaded.slug === slug ? loaded.stats : null

    useEffect(() => {
        const controller = new AbortController()
        fetchArtistStats(slug, controller.signal)
            .then(found => setLoaded({ slug, stats: found }))
            .catch(() => {})
        return () => controller.abort()
    }, [slug])

    if (!stats || (stats.gigs.total === 0 && stats.followers === 0)) return null
    return (
        <section className="panel mb-4">
            <h2 className="panel__label">Numbers</h2>
            <GigStats stats={stats} />
        </section>
    )
}

export default ArtistNumbers
