import { describe, expect, it } from 'vitest'
import { errorOf } from './formErrors.js'
import { showsOpenCall } from './openCall.js'
import { isSitePath } from './sitePath.js'
import { parseDay } from './eventDates.js'
import { emptyMapPlace, mapPlaceOf } from './mapPlace.js'

describe('errorOf', () => {
    it('names each refused field and why', () => {
        const err = { response: { data: { errors: { photoUrl: 'must be an https:// address', name: 'must not be blank' } } } }
        expect(errorOf(err)).toBe('Some fields need a fix: photoUrl must be an https:// address, name must not be blank')
    })

    it("uses the backend's message, else the fallback", () => {
        expect(errorOf({ response: { data: { message: 'Only the label can edit this page.' } } })).toBe('Only the label can edit this page.')
        expect(errorOf(new Error('Network Error'), 'Could not send.')).toBe('Could not send.')
        expect(errorOf(undefined)).toBe('Could not save. Try again.')
    })
})

describe('showsOpenCall', () => {
    it('shows on the pages people browse', () => {
        for (const path of ['/artists', '/artists/ajja', '/labels/TIP Records', '/festivals/ozora', '/events/123', '/map', '/profile']) {
            expect(showsOpenCall(path), path).toBe(true)
        }
    })

    it('stays away from forms, accounts, editing, the admin panel and the endless events list', () => {
        for (const path of ['/events', '/events/new', '/new-page', '/feedback', '/login', '/register', '/verify-email',
            '/admin', '/admin/requests', '/artists/ajja/edit', '/festivals/ozora/edit']) {
            expect(showsOpenCall(path), path).toBe(false)
        }
    })
})

describe('isSitePath', () => {
    it('takes only paths of this site', () => {
        expect(isSitePath('/events/123')).toBe(true)
        expect(isSitePath('/?genre=forest')).toBe(true)
        for (const other of ['https://evil.example', '//evil.example', '/\\evil.example', 'events', '', null, 42]) {
            expect(isSitePath(other), String(other)).toBe(false)
        }
    })
})

describe('parseDay', () => {
    it('keeps the calendar day whatever the time zone', () => {
        const day = parseDay('2026-10-24T23:30:00')
        expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 9, 24])
        expect(parseDay('')).toBeNull()
        expect(parseDay(null)).toBeNull()
    })
})

describe('mapPlaceOf', () => {
    it('trims, turns the year into a number and leaves blanks out', () => {
        expect(mapPlaceOf({ ...emptyMapPlace('Serbia '), since: '2019', description: '  Forest ', genres: ['forest'] }))
            .toEqual({ country: 'Serbia', since: 2019, description: 'Forest', genres: ['forest'] })
        expect(mapPlaceOf(emptyMapPlace())).toEqual({ country: null, since: null, description: null, genres: [] })
    })
})
