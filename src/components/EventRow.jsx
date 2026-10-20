import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'
import GoingButton from './GoingButton'

// "2026-10-24" -> day 24, "Sat · Oct". Built from the parts, so the browser can't move it to another day
function boardDate(value) {
    if (!value) return null
    const [year, month, day] = value.split('T')[0].split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return {
        day,
        when: `${date.toLocaleDateString('en-GB', { weekday: 'short' })} · ${date.toLocaleDateString('en-GB', { month: 'short' })}`,
    }
}

// The column titles of the departure board; render once above a list of EventRows
export function BoardHead() {
    return (
        <div className="board__head" aria-hidden="true">
            <span>Date</span>
            <span />
            <span>Event</span>
            <span />
        </div>
    )
}

// One event as a line on the departure board. `weather` and `going` ({ count, going }) are fetched by
// the parent for the whole list in one request (see api/weather.js); without `onGoingChange` there is
// no "I'm going" button.
function EventRow({ event, weather, going, onGoingChange }) {
    const date = boardDate(event.dateStart)
    // The row's event is passed along so the event page can show it before its details load
    const linkProps = { to: `/events/${event.id}`, state: { event } }

    return (
        <div className="board__row">
            <Link {...linkProps} className="board__date" tabIndex={-1} aria-hidden="true">
                {date ? (
                    <>
                        <span className="board__day">{String(date.day).padStart(2, '0')}</span>
                        <span className="board__when">{date.when}</span>
                    </>
                ) : (
                    <span className="board__when">TBA</span>
                )}
            </Link>

            <Link {...linkProps} className="board__thumb-link" tabIndex={-1} aria-hidden="true">
                {event.urlImageMedium ? (
                    <img src={event.urlImageMedium} alt="" loading="lazy" decoding="async" className="board__thumb"
                        onError={(e) => { e.target.style.visibility = 'hidden' }} />
                ) : (
                    <span className="board__thumb" />
                )}
            </Link>

            <Link {...linkProps} className="board__main">
                <span className="board__title" title={event.nameParty}>{event.nameParty}</span>
                <span className="board__place">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</span>
                <span className="board__meta">
                    {event.nameType && <span>{event.nameType}</span>}
                    {weather && <span>{Math.round(weather.temperature)}°C now</span>}
                    {/cancel/i.test(event.nameStatus || '') && <span className="text-[var(--danger)]">{event.nameStatus}</span>}
                </span>
            </Link>

            <div className="board__side">
                {onGoingChange && <GoingButton eventId={event.id} status={going} onChange={onGoingChange} />}
                <FavoriteButton event={event} />
            </div>
        </div>
    )
}

export default EventRow
