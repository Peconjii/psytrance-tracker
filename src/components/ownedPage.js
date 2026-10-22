import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

// A label's or festival's page as its owner wrote it, and whether the logged-in account may edit it (an admin, or the
// owner: one of the pages fetchMine lists, matched by isMine). page is null until loaded or when there is none.
export function useOwnedPage(fetchPage, fetchMine, id, isMine) {
    const { user } = useAuth()
    const [loaded, setLoaded] = useState({ id: null, page: null })
    const [mine, setMine] = useState([])

    useEffect(() => {
        const controller = new AbortController()
        fetchPage(id, controller.signal).then(page => setLoaded({ id, page })).catch(() => {})
        return () => controller.abort()
    }, [fetchPage, id])

    useEffect(() => {
        if (!user) return
        const controller = new AbortController()
        fetchMine(controller.signal).then(setMine).catch(() => {})
        return () => controller.abort()
    }, [fetchMine, user])

    return {
        page: loaded.id === id ? loaded.page : null,
        canEdit: Boolean(user && (user.admin || mine.some(isMine))),
    }
}
