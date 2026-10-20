import { Link } from 'react-router-dom';
import { HudShell } from './Panel';
import { data, genreById } from '../data/types';
import { eventDates, type MapEvent } from '../data/events';

interface Props {
  /** The events of the fleet (one ship or several), or of the harbour */
  events: MapEvent[];
  harbour: boolean;
  onSelect: (genreId: string) => void;
  onClose: () => void;
}

const SOURCE_TEXT = {
  ARTIST: 'artists on the map',
  STAGE: 'stage names in the line-up',
  KEYWORD: 'genres picked by the organizer',
} as const;

/** HUD for ships: each event with its date, place and the genres its crew plays */
export function FleetPanel({ events, harbour, onSelect, onClose }: Props) {
  const main = events[0]?.genres[0] ? genreById[events[0].genres[0].genreId] : null;
  const color = main ? data.families[main.family].color : '#9a94b8';
  return (
    <HudShell className="hud" style={{ ['--fam' as string]: color }}>
      <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
      <div className="hud__tag">{harbour ? '// HARBOUR · GENRE UNKNOWN' : events.length > 1 ? `// FLEET · ${events.length} SHIPS` : '// SHIP · EVENT'}</div>
      <h2>{harbour ? 'Harbour' : events.length > 1 ? `${events.length} events` : events[0].nameParty}</h2>
      {harbour && (
        <p className="hud__muted">
          None of these line-ups has an artist on the map, a genre in a stage name or genres picked by the organizer yet.
        </p>
      )}
      <ul className="fleet">
        {events.map((e) => (
          <li key={e.id}>
            {(events.length > 1 || harbour) && <b className="fleet__name">{e.nameParty}</b>}
            <div className="fleet__meta">
              <span>{eventDates(e)}</span>
              <span>{[e.nameTown, e.nameCountry].filter(Boolean).join(', ')}</span>
              <span>{e.nameType}</span>
            </div>
            {e.genres.length > 0 && (
              <div className="hud__chips">
                {e.genres.map((g) => {
                  const genre = genreById[g.genreId];
                  return (
                    <button key={g.genreId} className="hud__chip" onClick={() => onSelect(g.genreId)}
                      style={{ borderColor: data.families[genre.family].color }} title={`From ${SOURCE_TEXT[g.source]}`}>
                      {genre.name} {Math.round(g.share * 100)}%
                    </button>
                  );
                })}
              </div>
            )}
            <Link className="fleet__link" to={`/events/${e.id}`}>Line-up and details →</Link>
          </li>
        ))}
      </ul>
    </HudShell>
  );
}
