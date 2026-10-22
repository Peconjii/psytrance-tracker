// Finding the town of an event with Open-Meteo's free geocoding (the same service as the weather):
// [{ name, region, country, lat, lon, timeZone }]
export async function searchPlaces(name, signal) {
    const params = new URLSearchParams({ name, count: '6', language: 'en', format: 'json' })
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal })
    if (!response.ok) throw new Error(`Place search failed: ${response.status}`)
    const data = await response.json()
    return (data.results ?? []).map(place => ({
        name: place.name,
        region: place.admin1 ?? '',
        country: place.country ?? '',
        lat: place.latitude,
        lon: place.longitude,
        timeZone: place.timezone,
    }))
}
