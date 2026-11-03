// The forecast for the day of an event, from Open-Meteo (daily, 16 days ahead), cached per browser session.
// Events further away get none: the weather today says nothing about a festival next month.
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
        return JSON.parse(sessionStorage.getItem(`forecast_${key}`))
    } catch {
        return null
    }
}

function writeCached(key, weather) {
    try {
        sessionStorage.setItem(`forecast_${key}`, JSON.stringify(weather))
    } catch {
        // Storage full or blocked: the forecast is still returned, just not cached
    }
}

// Returns { [weatherKey]: daily forecast } for the given events (see forecastFor). Cached forecasts are
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
            `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max,temperature_2m_min&forecast_days=16&timezone=auto`,
            { signal }
        )
        if (!res.ok) throw new Error(`HTTP status ${res.status}`)
        const data = await res.json()
        // One location comes back as an object, several as an array in request order
        const forecasts = Array.isArray(data) ? data : [data]

        forecasts.forEach((forecast, i) => {
            if (forecast?.daily?.time) {
                result[missing[i]] = forecast.daily
                writeCached(missing[i], forecast.daily)
            }
        })
    } catch {
        // Leave the uncached events without weather
    }

    return result
}

// { min, max } in °C for the event's day from a daily forecast, or null when the day is beyond it. An event that
// already started (a festival in full swing) gets today's. Dates are the venue's own, like the forecast's days.
export function forecastFor(event, daily) {
    if (!daily?.time?.length || !event?.dateStart) return null
    const today = daily.time[0]
    const start = String(event.dateStart).slice(0, 10)
    const end = event.dateEnd ? String(event.dateEnd).slice(0, 10) : start
    const day = start < today && end >= today ? today : start
    const i = daily.time.indexOf(day)
    if (i < 0 || daily.temperature_2m_max?.[i] == null) return null
    return { min: Math.round(daily.temperature_2m_min[i]), max: Math.round(daily.temperature_2m_max[i]) }
}
