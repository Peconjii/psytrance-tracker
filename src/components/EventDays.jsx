import { parseDay } from './eventDates'

const DAY_TITLE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// Events in date order, cut into days: [{ key, date, events }]. Consecutive events of the same start
// day share a group; events without a date end up in their own group.
function groupByDay(events) {
    const groups = []
    for (const event of events) {
        const key = event.dateStart ? event.dateStart.split('T')[0] : 'tba'
        const last = groups[groups.length - 1]
        if (last && last.key === key) last.events.push(event)
        else groups.push({ key, date: parseDay(event.dateStart), events: [event] })
    }
    return groups
}

// The event list as days: a heading per start day, then that day's tickets in a grid.
// Festivals that started before today are listed under their first day, marked as still running.
function EventDays({ events, renderTicket }) {
    const today = startOfToday()
    return groupByDay(events).map(({ key, date, events: dayEvents }) => (
        <section key={key} className="day" aria-labelledby={`day-${key}`}>
            <header className="day__head">
                <h2 id={`day-${key}`} className="day__title">{date ? DAY_TITLE.format(date) : 'Date to be announced'}</h2>
                <span className="day__count">
                    {date && date < today && 'STARTED · ON NOW · '}
                    {dayEvents.length} {dayEvents.length === 1 ? 'EVENT' : 'EVENTS'}
                </span>
            </header>
            <div className="tickets">
                {dayEvents.map(renderTicket)}
            </div>
        </section>
    ))
}

export default EventDays
