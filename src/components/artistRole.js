// An artist's main role. It is only a label and a filter: every artist gets the same profile options.
export const ROLES = [
    { value: 'DJ', label: 'DJ' },
    { value: 'PRODUCER', label: 'Producer' },
    { value: 'LIVE', label: 'Live act' },
]
export const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

/** Whether an artist with this role shows under a role filter: every producer also plays DJ sets, not every DJ produces */
export function matchesRole(role, filter) {
    return role === filter || (filter === 'DJ' && role === 'PRODUCER')
}

/**
 * The role the artist picked, or a guess when they didn't: a live act when most of their line-ups say "live", else a
 * DJ. Producer is never guessed (producers play DJ sets too): only the artist or an admin picks it.
 * Returns { role, guessed }.
 */
export function roleOf(artist) {
    if (artist.role) return { role: artist.role, guessed: false }
    if ((artist.liveShare ?? 0) >= 0.5) return { role: 'LIVE', guessed: true }
    return { role: 'DJ', guessed: true }
}
