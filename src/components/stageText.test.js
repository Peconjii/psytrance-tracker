import { describe, expect, it } from 'vitest'
import { eventDays, lineUpOf, stagesOf } from './stageText.js'

// Friday 13 to Sunday 15 November 2026
const DAYS = eventDays('2026-11-13T20:00', '2026-11-15T12:00')

const STAGES = [
    {
        name: 'Main Stage', genreId: 'night', sets: [
            { day: 'Fri', start: '23:00', end: '01:00', artist: 'Ajja', live: false },
            { day: 'Sat', start: '01:00', end: '02:30', artist: 'Some Local Hero', live: true },
        ],
    },
    {
        name: 'Chai Shop', genreId: 'psybient', sets: [
            { day: '', start: '', end: '', artist: 'Kaya Project', live: false },
        ],
    },
]

// The same format the backend's TimetableParserTest reads (theStageCardsOfOurEventFormAreReadAsWritten)
const TEXT = `Main Stage (Night full-on):
Fri 23:00-01:00 Ajja
Sat 01:00-02:30 Some Local Hero (live)

Chai Shop (Psybient / Psychill):
Kaya Project`

describe('eventDays', () => {
    it('lists the days of the event by weekday', () => {
        expect(DAYS.map(d => d.value)).toEqual(['Fri', 'Sat', 'Sun'])
        expect(DAYS[0].label).toContain('13')
    })

    it('takes the next day too when there is no end', () => {
        expect(eventDays('2026-11-13T20:00', '').map(d => d.value)).toEqual(['Fri', 'Sat'])
    })

    it('is empty until the start is picked', () => {
        expect(eventDays('', '')).toEqual([])
    })
})

describe('lineUpOf', () => {
    it('writes a header per stage with its genre, then weekday, times and name of each set', () => {
        expect(lineUpOf(STAGES, DAYS)).toBe(TEXT)
    })

    it('writes no header for one stage without a name or genre, and leaves out empty sets', () => {
        const one = [{ name: '', genreId: '', sets: [
            { day: '', start: '22:00', end: '', artist: 'Ajja', live: false },
            { day: '', start: '', end: '', artist: '  ', live: false },
        ] }]
        // A set with a time but no day is on the first day
        expect(lineUpOf(one, DAYS)).toBe('Fri 22:00 Ajja')
    })

    it('keeps colons and brackets out of names, which would read as headers', () => {
        const odd = [{ name: 'Main: Floor', genreId: '', sets: [{ day: '', start: '', end: '', artist: 'DJ (x): y', live: false }] }]
        expect(lineUpOf(odd, DAYS)).toBe('Main Floor:\nDJ x y')
    })
})

describe('stagesOf', () => {
    it('turns the text the cards wrote back into the same cards', () => {
        expect(stagesOf(TEXT)).toEqual(STAGES)
    })

    it('keeps brackets that are no map genre in the stage name', () => {
        expect(stagesOf('Garden (by night):\nAjja')[0]).toMatchObject({ name: 'Garden (by night)', genreId: '' })
    })

    it('reads a plain list of names as one stage', () => {
        expect(stagesOf('Ajja\nTristan')).toEqual([{ name: '', genreId: '', sets: [
            { day: '', start: '', end: '', artist: 'Ajja', live: false },
            { day: '', start: '', end: '', artist: 'Tristan', live: false },
        ] }])
    })

    it('leaves any other text as text', () => {
        expect(stagesOf('Ajja\nTickets: 20 € at the door')).toBeNull()
        expect(stagesOf('Info https://example.com')).toBeNull()
        expect(stagesOf('')).toBeNull()
    })
})
