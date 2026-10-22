import { useState } from 'react'

const KEY = 'statsView'

// Whether the numbers show as a list or as charts; remembered in this browser (private windows may not keep it)
export function useStatsView() {
    const [view, setView] = useState(() => {
        try {
            return localStorage.getItem(KEY) === 'chart' ? 'chart' : 'list'
        } catch {
            return 'list'
        }
    })
    const toggle = () => {
        const next = view === 'chart' ? 'list' : 'chart'
        setView(next)
        try {
            localStorage.setItem(KEY, next)
        } catch {
            // Not kept, but the page works the same
        }
    }
    return [view, toggle]
}
