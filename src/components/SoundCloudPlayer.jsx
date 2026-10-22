import { useState } from 'react'

// The artist's own SoundCloud as a player. SoundCloud's player loads its own scripts and cookies, so it only loads
// when the visitor asks for it.
function SoundCloudPlayer({ url, name }) {
    const [open, setOpen] = useState(false)
    if (!open) {
        return (
            <button type="button" className="btn" onClick={() => setOpen(true)}>
                ▶ Play {name} on SoundCloud
            </button>
        )
    }
    const src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url)
        + '&color=%2346e6c3&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&visual=true'
    return (
        <iframe title={`${name} on SoundCloud`} src={src} width="100%" height="300" allow="autoplay"
            style={{ border: 0, display: 'block', maxWidth: 720 }} />
    )
}

export default SoundCloudPlayer
