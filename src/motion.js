import { useSyncExternalStore } from 'react'

// "Reduced motion" for the whole site: no pulsing stars, orbiting satellites, sailing ships or camera
// flights, and no CSS animations. It starts from the system setting and the visitor can switch it in
// the navbar; the choice is remembered in the browser. It shows as <html data-motion="reduced">.

const KEY = 'motion'
const listeners = new Set()

function read() {
    try {
        const saved = localStorage.getItem(KEY)
        if (saved === 'reduced' || saved === 'full') return saved === 'reduced'
    } catch {
        // Storage can be blocked (private mode); fall back to the system setting
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let reduced = read()
const apply = () => {
    document.documentElement.toggleAttribute('data-motion', reduced)
    if (reduced) document.documentElement.setAttribute('data-motion', 'reduced')
}
apply()

export function setReducedMotion(value) {
    reduced = value
    try {
        localStorage.setItem(KEY, value ? 'reduced' : 'full')
    } catch {
        // Not remembered, but still applied for this visit
    }
    apply()
    listeners.forEach(listener => listener())
}

/** Whether motion is reduced; re-renders when the visitor switches it */
export function useReducedMotion() {
    return useSyncExternalStore(
        listener => { listeners.add(listener); return () => listeners.delete(listener) },
        () => reduced,
    )
}
