// Current weather at event venues from Open-Meteo, cached per browser session.
// Open-Meteo accepts comma-separated coordinates, so a whole page of events needs one request.

export function eventCoords(event) {
    const lat = event?.parsedLat || event?.lat || event?.geoLat
    const lon = event?.parsedLon || event?.lon || event?.geoLon
    return lat && lon ? { lat, lon } : null
}

// Coordinates rounded to 1 decimal so nearby events share one cached forecast
export function weatherKey(event) {
    const coords = eventCoords(event)
    if (!coords) return null
    return `${Number(coords.lat).toFixed(1)}_${Number(coords.lon).toFixed(1)}`
}

function readCached(key) {
    try {
        return JSON.parse(sessionStorage.getItem(`weather_${key}`))
    } catch {
        return null
    }
}

function writeCached(key, weather) {
    try {
        sessionStorage.setItem(`weather_${key}`, JSON.stringify(weather))
    } catch {
        // Storage full or blocked: the forecast is still returned, just not cached
    }
}

// Returns { [weatherKey]: current_weather } for the given events. Cached forecasts are
// reused and everything else is fetched in a single request. Never throws: weather is a
// nice extra, so on failure the cards simply have no weather badge.
export async function fetchWeatherForEvents(events, signal) {
    const result = {}
    const missing = []

    for (const event of events) {
        const key = weatherKey(event)
        if (!key || key in result || missing.includes(key)) continue
        const cached = readCached(key)
        if (cached) result[key] = cached
        else missing.push(key)
    }

    if (missing.length === 0) return result

    const lats = missing.map(key => key.split('_')[0]).join(',')
    const lons = missing.map(key => key.split('_')[1]).join(',')

    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true`,
            { signal }
        )
        if (!res.ok) throw new Error(`HTTP status ${res.status}`)
        const data = await res.json()
        // One location comes back as an object, several as an array in request order
        const forecasts = Array.isArray(data) ? data : [data]

        forecasts.forEach((forecast, i) => {
            if (forecast?.current_weather) {
                result[missing[i]] = forecast.current_weather
                writeCached(missing[i], forecast.current_weather)
            }
        })
    } catch {
        // Leave the uncached events without weather
    }

    return result
}
