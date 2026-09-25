import { useEffect, useState } from 'react'

// Returns `value` only after it has stopped changing for `delayMs`,
// so typing "boom" sends one request instead of four
export default function useDebouncedValue(value, delayMs) {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    return debounced
}
