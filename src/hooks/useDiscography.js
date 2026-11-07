import { useEffect, useState } from 'react'
import { loadDiscography } from '../map/data/discography'

// Draws the page again once the albums and festival sets from the backend are in (see map/data/discography.ts)
export default function useDiscography() {
    const [, setVersion] = useState(0)
    useEffect(() => {
        let alive = true
        loadDiscography().then(() => alive && setVersion(v => v + 1))
        return () => { alive = false }
    }, [])
}
