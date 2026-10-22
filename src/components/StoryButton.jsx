import { useState } from 'react'
import { artistSlug } from '../map/data/events'
import { storyImage } from './storyImage.js'

// For the artist (and admins) on their page: "I play at X" as a picture for a story, saved to the device. On a phone
// that can share files, the share sheet opens instead (straight to Instagram).
function StoryButton({ artistName, event }) {
    const [busy, setBusy] = useState(false)

    const make = async () => {
        setBusy(true)
        try {
            const blob = await storyImage(artistName, event)
            const fileName = `${artistSlug(artistName)}-${event.id}-story.png`
            const file = new File([blob], fileName, { type: 'image/png' })
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: `${artistName} at ${event.nameParty}` }).catch(() => {})
            } else {
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = fileName
                link.click()
                setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <button type="button" className="btn btn--ghost shrink-0" onClick={make} disabled={busy}
            title="A picture for your story: I play at this event">
            {busy ? '…' : '📷 Story'}
        </button>
    )
}

export default StoryButton
