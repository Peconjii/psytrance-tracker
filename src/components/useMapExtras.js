import { useEffect, useState } from 'react'
import { loadMapExtras, mapExtrasApplied } from '../map/data/extras'

// True once the labels and festivals admins added to the map are in the map data, so a page can look one up
// (and only then say there is no such label or festival)
export function useMapExtras() {
    const [ready, setReady] = useState(mapExtrasApplied)
    useEffect(() => {
        if (!ready) loadMapExtras().then(() => setReady(true))
    }, [ready])
    return ready
}
