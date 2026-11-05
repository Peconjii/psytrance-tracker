/** "Astral Projection" → "AP": the first letters of the first two words, for a picture placeholder */
export const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
