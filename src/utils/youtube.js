// YouTube links as people paste them: from the app, the phone, a playlist, with a start time...
// The 11-character video id is found in all of them, and the link is written back short and clean.

const ID = /^[A-Za-z0-9_-]{11}$/
const IN_LINK = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i

/** The video id in a YouTube link or on its own; null for anything else */
export function youtubeIdOf(text) {
    const value = (text ?? '').trim()
    if (ID.test(value)) return value
    return value.match(IN_LINK)?.[1] ?? null
}

/** Is this meant as a YouTube link (whether or not its id is whole)? */
export const looksLikeYouTube = (text) => /youtu\.?be/i.test(text ?? '') || /^[A-Za-z0-9_-]{9,12}$/.test((text ?? '').trim())

/**
 * A pasted YouTube link made clean: https://www.youtube.com/watch?v=ID, without the playlist, radio or start time.
 * Anything that isn't a YouTube link comes back as it was.
 */
export function cleanYouTubeLink(text) {
    const id = youtubeIdOf(text)
    return id && /youtu\.?be/i.test(text) ? `https://www.youtube.com/watch?v=${id}` : text
}
