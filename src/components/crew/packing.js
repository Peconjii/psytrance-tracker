// Packing suggestions for a crew: from the kind of event and, close to the date, the weather forecast.
// Nothing is added on its own: the crew page shows them as dashed chips, one tap adds one to the list.

const BASE = ['Water', 'Earplugs', 'Power bank', 'Cash']
const OUTDOOR = ['Tent', 'Gazebo', 'Sleeping bag', 'Head torch', 'Camping chairs', 'Gas stove', 'Toilet paper', 'Sunscreen']
const FOREST = ['Mosquito repellent', 'Warm layer for the night']
const INDOOR = ['Jacket for the cloakroom', 'Bag for the cloakroom']

const isIndoor = (type) => /club|indoor/i.test(type || '')
const isForest = (type, name) => /forest|wald|nature/i.test(`${type || ''} ${name || ''}`)

// [{ name, why }] for the event type; `why` is the short reason shown on the chip
export function typeSuggestions(eventType, eventName) {
    const out = BASE.map((name) => ({ name, why: 'always' }))
    if (isIndoor(eventType)) {
        INDOOR.forEach((name) => out.push({ name, why: 'indoor' }))
    } else {
        OUTDOOR.forEach((name) => out.push({ name, why: 'open air' }))
        if (isForest(eventType, eventName)) FOREST.forEach((name) => out.push({ name, why: 'forest' }))
    }
    return out
}

const DAY = new Intl.DateTimeFormat('en', { weekday: 'short' })

// Daily forecast for the event's days (Open-Meteo, up to 16 days ahead), or null when it's further away
export async function fetchCrewForecast(lat, lon, startsOn, endsOn, signal) {
    if (lat == null || lon == null || !startsOn) return null
    const params = new URLSearchParams({
        latitude: lat, longitude: lon, timezone: 'auto', forecast_days: '16',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    })
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
        if (!res.ok) return null
        const { daily } = await res.json()
        const days = (daily?.time || []).map((date, i) => ({
            date,
            max: daily.temperature_2m_max[i],
            min: daily.temperature_2m_min[i],
            rain: daily.precipitation_probability_max?.[i] ?? 0,
        })).filter((d) => d.date >= startsOn && d.date <= (endsOn || startsOn))
        return days.length ? days : null
    } catch {
        return null
    }
}

// [{ name, why }] from the forecast days: rain, cold nights, heat
export function weatherSuggestions(days, indoor) {
    if (!days?.length) return []
    const out = []
    const label = (d) => DAY.format(new Date(`${d.date}T12:00:00`))
    const rainy = days.find((d) => d.rain >= 50)
    if (rainy) {
        out.push({ name: 'Raincoat', why: `rain ${label(rainy)}` })
        if (!indoor) out.push({ name: 'Rubber boots', why: `rain ${label(rainy)}` })
    }
    const cold = days.reduce((a, d) => (a == null || d.min < a.min ? d : a), null)
    if (cold && cold.min <= 8 && !indoor) out.push({ name: 'Warm sleeping bag', why: `${Math.round(cold.min)}°C at night` })
    if (cold && cold.min <= 3) out.push({ name: 'Gloves and a hat', why: `${Math.round(cold.min)}°C` })
    const hot = days.find((d) => d.max >= 28)
    if (hot) {
        out.push({ name: 'Hat for the sun', why: `${Math.round(hot.max)}°C ${label(hot)}` })
        out.push({ name: 'Electrolytes', why: `${Math.round(hot.max)}°C ${label(hot)}` })
    }
    return out
}

// Suggestions not on the list yet (case-insensitive), weather first, without repeats
export function openSuggestions(suggestions, items) {
    const have = new Set(items.map((i) => i.name.toLowerCase()))
    const seen = new Set()
    return suggestions.filter((s) => {
        const key = s.name.toLowerCase()
        if (have.has(key) || seen.has(key)) return false
        seen.add(key)
        return true
    })
}
