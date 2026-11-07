import { data, genreById } from '../map/data/types'
import { WEEKDAY_DAY as DAY_LABEL } from '../dates.js'

// The stage cards of the event form and the line-up text they stand for. The backend reads the text as it reads any
// line-up (TimetableParser, its test theStageCardsOfOurEventFormAreReadAsWritten checks this format):
//
//   Main Stage (Morning full-on):      <- a stage, its genres' map names in brackets, comma separated, up to 4
//                                         (MapGenres.genresInBrackets); the first stage is the main one
//   Fri 23:00-01:00 Ajja               <- weekday, start, end (optional), the artist
//   Sat 01:00 Tristan (live)
//   Some Friend                        <- an artist without a set time
//
// The weekday leaves no guessing whether 01:00 is the night after.

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const emptySet = (day = '', start = '') => ({ day, start, end: '', artist: '', live: false })
export const MAX_STAGE_GENRES = 4
export const emptyStage = () => ({ name: '', genreIds: [], sets: [emptySet()] })

/** The days of the event, from the form's start and end ("2026-10-23T22:00"): [{ value: 'Fri', label: 'Fri 23 Oct' }] */
export function eventDays(startsAt, endsAt) {
    if (!startsAt) return []
    const first = new Date(startsAt.slice(0, 10) + 'T12:00:00')
    const last = endsAt ? new Date(endsAt.slice(0, 10) + 'T12:00:00') : new Date(first.getTime() + 86_400_000)
    const days = []
    // A weekday names one day only within a week
    for (let d = new Date(first); d <= last && days.length < 7; d = new Date(d.getTime() + 86_400_000)) {
        days.push({ value: WEEKDAYS[d.getDay()], label: DAY_LABEL.format(d) })
    }
    return days
}

const clean = (text) => text.replace(/[():\r\n]/g, ' ').replace(/\s+/g, ' ').trim()

/** The line-up text of the stage cards */
export function lineUpOf(stages, days) {
    const blocks = []
    const withHeaders = stages.length > 1 || stages.some(s => clean(s.name) || s.genreIds.length)
    for (const stage of stages) {
        const lines = []
        if (withHeaders) {
            const names = stage.genreIds.map(id => genreById[id]?.name).filter(Boolean)
            lines.push(`${clean(stage.name) || 'Stage'}${names.length ? ` (${names.join(', ')})` : ''}:`)
        }
        for (const set of stage.sets) {
            const artist = clean(set.artist)
            if (!artist) continue
            const name = artist + (set.live ? ' (live)' : '')
            lines.push(set.start
                ? `${set.day || days[0]?.value || ''} ${set.start}${set.end ? '-' + set.end : ''} ${name}`.trim()
                : name)
        }
        if (lines.length > (withHeaders ? 1 : 0)) blocks.push(lines.join('\n'))
    }
    return blocks.join('\n\n')
}

const HEADER = /^(.*?)\s*(?:\(([^()]+)\))?:$/
const SET = new RegExp(`^(${WEEKDAYS.join('|')}) (\\d{1,2}:\\d{2})(?:-(\\d{1,2}:\\d{2}))? (.+)$`)
const LIVE = / \(live\)$/i
// Read each time: genres admins added to the galaxy join after the site loads
const genreIdByName = (name) => data.genres.find(g => g.name.toLowerCase() === name)?.id

/**
 * The stage cards of a line-up text, when it is written the way the cards write it (or is only names, one per line);
 * null for any other text, which then stays text.
 */
export function stagesOf(text) {
    const stages = []
    let stage = null
    for (const raw of (text || '').split(/\r?\n/)) {
        const line = raw.trim()
        if (!line) continue
        const header = line.match(HEADER)
        if (header) {
            const ids = header[2] ? header[2].split(',').map(n => genreIdByName(n.trim().toLowerCase())) : []
            // Brackets that are no map genres are part of the name
            const genres = ids.length && ids.every(Boolean) ? [...new Set(ids)] : []
            const name = header[2] && !genres.length ? `${header[1]} (${header[2]})` : header[1]
            stage = { name: name === 'Stage' ? '' : name, genreIds: genres, sets: [] }
            stages.push(stage)
            continue
        }
        if (!stage) {
            stage = { name: '', genreIds: [], sets: [] }
            stages.push(stage)
        }
        const set = line.match(SET)
        const rest = set ? set[4] : line
        // Anything else than a name (a link, "Tickets: 20 €") means it isn't the cards' text
        if (!set && (/https?:|www\.|:/.test(line) || line.length > 80)) return null
        stage.sets.push({
            day: set ? set[1] : '',
            start: set ? set[2].padStart(5, '0') : '',
            end: set?.[3] ? set[3].padStart(5, '0') : '',
            artist: rest.replace(LIVE, ''),
            live: LIVE.test(rest),
        })
    }
    for (const s of stages) if (s.sets.length === 0) s.sets.push(emptySet())
    return stages.length ? stages : null
}

/** { name, genreIds } -> "Main stage (Forest, Goa trance)": a stage with its genres, as the timetable stores it */
export function stageWithGenres(name, genreIds) {
    const names = genreIds.map(id => genreById[id]?.name).filter(Boolean)
    const base = (name || '').replace(/:/g, ' ').replace(/\s+/g, ' ').trim()
    return names.length ? `${base || 'Stage'} (${names.join(', ')})` : base
}

/**
 * "Main stage (Forest, Goa trance)" -> { name: 'Main stage', genreIds: ['forest', 'goa'] }: a timetable's stage
 * as our event form writes it; a stage without map genres in brackets keeps its whole name
 */
export function stageParts(stage) {
    const header = (stage || '').match(/^(.*?)\s*\(([^()]+)\)\s*$/)
    if (!header) return { name: stage || '', genreIds: [] }
    const ids = header[2].split(',').map(n => genreIdByName(n.trim().toLowerCase()))
    return ids.every(Boolean) ? { name: header[1], genreIds: [...new Set(ids)] } : { name: stage, genreIds: [] }
}
