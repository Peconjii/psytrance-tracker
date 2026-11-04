import { useSyncExternalStore } from 'react'

// The galaxy's year slider, shared with the phone menu ("More" in the bottom bar): the galaxy (MapOfPsy) owns the
// year and tells this store; the menu shows the slider while the galaxy is open and sends changes back.

let state = { active: false, year: 0, min: 0, max: 0, traveling: false }
let handlers = { setYear: () => {}, toggleTravel: () => {} }
const listeners = new Set()

export function shareGalaxyYear(next, nextHandlers) {
    state = { ...state, ...next }
    if (nextHandlers) handlers = nextHandlers
    listeners.forEach(listener => listener())
}

export const setGalaxyYear = (year) => handlers.setYear(year)
export const toggleGalaxyTravel = () => handlers.toggleTravel()

/** { active, year, min, max, traveling }: active while the galaxy is on screen */
export function useGalaxyYear() {
    return useSyncExternalStore(
        listener => { listeners.add(listener); return () => listeners.delete(listener) },
        () => state,
    )
}
