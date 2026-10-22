import { artists as mapProfiles, labelsOfArtist } from '../map/data/types'
import { mapArtistBySlug } from '../map/data/events'

// An artist's main role. It is only a label and a filter: every artist gets the same profile options.
export const ROLES = [
    { value: 'DJ', label: 'DJ' },
    { value: 'PRODUCER', label: 'Producer' },
    { value: 'LIVE', label: 'Live act' },
]
export const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

/**
 * The role the artist picked, or a careful guess when they didn't: a producer only with releases (albums or a label
 * on the map; a track on YouTube is not enough), a live act when most of their line-ups say "live", else a DJ.
 * Returns { role, guessed }.
 */
export function roleOf(artist) {
    if (artist.role) return { role: artist.role, guessed: false }
    const mapName = mapArtistBySlug(artist.slug)?.name
    const hasReleases = mapName && ((mapProfiles[mapName]?.albums?.length ?? 0) > 0 || labelsOfArtist(mapName).length > 0)
    if (hasReleases) return { role: 'PRODUCER', guessed: true }
    if ((artist.liveShare ?? 0) >= 0.5) return { role: 'LIVE', guessed: true }
    return { role: 'DJ', guessed: true }
}
