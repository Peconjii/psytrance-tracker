// What MapPlaceFields edits: where a label or festival goes on the map

/** Empty fields, the country filled in when it is known */
export const emptyMapPlace = (country = '') => ({ country, since: '', description: '', genres: [] })

/** The request body for the backend: null fields left out */
export const mapPlaceOf = (value) => ({
    country: value.country.trim() || null,
    since: value.since ? Number(value.since) : null,
    description: value.description.trim() || null,
    genres: value.genres,
})
