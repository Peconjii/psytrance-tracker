import { useState } from 'react'
import { looksLikeYouTube, youtubeIdOf } from '../utils/youtube.js'

/**
 * Under a field that takes a YouTube link: the video's thumbnail, so a wrong or cut link (a missing "-") shows
 * before saving instead of after. Nothing for links to other sites.
 */
export default function YouTubeCheck({ value }) {
    const id = youtubeIdOf(value)
    // A video that doesn't exist has no real thumbnail; remembered per id
    const [checked, setChecked] = useState({ id: null, found: false })

    if (!value?.trim() || !looksLikeYouTube(value)) return null
    if (!id) {
        return <p className="mono text-xs m-0" style={{ color: 'var(--danger)' }}>Not a whole YouTube link: the video id has 11 characters (check it wasn&apos;t cut, e.g. a “-” at the start).</p>
    }
    if (checked.id === id && !checked.found) {
        return <p className="mono text-xs m-0" style={{ color: 'var(--danger)' }}>YouTube has no video with this id ({id}). Check the link.</p>
    }
    return (
        <a className="inline-flex items-center gap-2 mono text-xs muted" href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
            {/* For an id with no video YouTube answers with a small grey 120 px picture instead of the 320 px thumbnail */}
            <img key={id} src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" width="64" height="36"
                onLoad={(e) => setChecked({ id, found: e.currentTarget.naturalWidth > 120 })}
                onError={() => setChecked({ id, found: false })} style={{ objectFit: 'cover' }} />
            {checked.id === id ? `✓ ${id} · open to check ↗` : 'Checking the video…'}
        </a>
    )
}
