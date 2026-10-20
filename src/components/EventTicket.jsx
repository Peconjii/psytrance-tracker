import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'
import GoingButton from './GoingButton'
import { data, genreById } from '../map/data/types'
import { parseDay } from './eventDates'

const weekday = (date) => date.toLocaleDateString('en-GB', { weekday: 'short' })
const month = (date) => date.toLocaleDateString('en-GB', { month: 'short' })

// The tear-off stub: the start day, and for a festival the day it ends
function Stub({ event }) {
    const start = parseDay(event.dateStart)
    const end = parseDay(event.dateEnd)
    if (!start) return <div className="ticket__stub"><span className="ticket__small">TBA</span></div>
    // A night that ends the next morning is still one party; only festivals of 2+ days show their end
    const multiDay = end && (end - start) / 86400000 >= 2
    return (
        <div className="ticket__stub">
            <span className="ticket__small">{weekday(start)}</span>
            <span className="ticket__day">{start.getDate()}</span>
            <span className="ticket__small">{month(start)}</span>
            {multiDay && <span className="ticket__until">→ {end.getDate()} {month(end)}</span>}
        </div>
    )
}

// One event as a ticket: date stub, flyer, name, place and the Map of Psy genres its line-up plays.
// `weather`, `going` ({ count, going }) and `genres` ([{ genreId, share }]) are fetched by the parent
// for the whole list in one request each; without `onGoingChange` there is no "I'm going" button.
function EventTicket({ event, weather, going, onGoingChange, genres = [] }) {
    const linkProps = { to: `/events/${event.id}`, state: { event } }
    const known = genres.filter(g => genreById[g.genreId])
    const main = known[0] && genreById[known[0].genreId]
    const isCancelled = /cancel/i.test(event.nameStatus || '')

    return (
        <article className="ticket" style={main ? { '--fam': data.families[main.family].color } : undefined}>
            <Stub event={event} />

            <div className="ticket__body">
                <Link {...linkProps} className="ticket__flyer" tabIndex={-1} aria-hidden="true">
                    {event.urlImageMedium && (
                        <img src={event.urlImageMedium} alt="" loading="lazy" decoding="async"
                            onError={(e) => { e.target.style.visibility = 'hidden' }} />
                    )}
                </Link>

                <div className="ticket__info">
                    <Link {...linkProps} className="ticket__title" title={event.nameParty}>{event.nameParty}</Link>
                    <p className="ticket__place">{[event.nameTown, event.nameCountry].filter(Boolean).join(', ')}</p>
                    <p className="ticket__meta">
                        {event.nameType && <span>{event.nameType}</span>}
                        {weather && <span>{Math.round(weather.temperature)}°C now</span>}
                        {isCancelled && <span className="text-[var(--danger)]">{event.nameStatus}</span>}
                    </p>
                </div>

                <div className="ticket__foot">
                    <div className="ticket__genres">
                        {known.slice(0, 3).map(g => {
                            const genre = genreById[g.genreId]
                            return (
                                <span key={g.genreId} className="genre-chip" style={{ '--c': data.families[genre.family].color }}
                                    title={`${Math.round(g.share * 100)}% of the line-up`}>
                                    {genre.name}
                                </span>
                            )
                        })}
                    </div>
                    <div className="ticket__actions">
                        {onGoingChange && <GoingButton eventId={event.id} status={going} onChange={onGoingChange} />}
                        <FavoriteButton event={event} />
                    </div>
                </div>
            </div>
        </article>
    )
}

export default EventTicket
