import { Link } from 'react-router-dom';
import { HudShell } from './Panel';
import { data, genreById } from '../data/types';
import { artistSlug, eventDates, type Boarded, type MapEvent } from '../data/events';
import type { CrewMember } from '../galaxy/Galaxy';
import { playingNow, type LiveFleet } from '../data/liveFleet';
import { useFollows } from '../../context/FollowsContext';

interface Props {
  /** The events of the fleet (one ship or several), or of the harbour */
  events: MapEvent[];
  harbour: boolean;
  /** Captain and crew once a single ship is boarded */
  boarded: Boarded | null;
  loadingCrew: boolean;
  onBoard: (eventId: number) => void;
  onSelectCrew: (member: CrewMember) => void;
  onSelect: (genreId: string) => void;
  onClose: () => void;
  /** The boarded event's fleet when its timetable spans several genres */
  liveFleet?: LiveFleet | null;
  previewing?: boolean;
  onPreview?: () => void;
}

const SOURCE_TEXT = {
  ARTIST: 'artists on the map',
  STAGE: 'stage names in the line-up',
  KEYWORD: 'genres picked by the organizer',
} as const;

/** HUD for ships: each event with its date, place and the genres its crew plays */
export function FleetPanel({ events, harbour, boarded, loadingCrew, onBoard, onSelectCrew, onSelect, onClose, liveFleet, previewing, onPreview }: Props) {
  const main = events[0]?.genres[0] ? genreById[events[0].genres[0].genreId] : null;
  const color = main ? data.families[main.family].color : '#9a94b8';
  // The crew the user follows (by name or through a label), for a ★ on their names
  const { gigsByEvent } = useFollows();
  const followedSlugs = new Set<string>((boarded ? gigsByEvent.get(boarded.id) ?? [] : []).map((name: string) => artistSlug(name)));
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
            {e.featured && <div className="fleet__featured">◆ Featured{e.featuredNote ? ` · ${e.featuredNote}` : ''}</div>}
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
            {events.length > 1 && !harbour && (
              <button className="fleet__board" onClick={() => onBoard(e.id)}>Board this ship ▸</button>
            )}
            <Link className="fleet__link" to={`/events/${e.id}`}>Line-up and details →</Link>
          </li>
        ))}
      </ul>
      {events.length === 1 && !harbour && liveFleet && (
        <LiveFleetSection fleet={liveFleet} previewing={!!previewing} onPreview={onPreview} onSelect={onSelect} />
      )}
      {events.length === 1 && !harbour && (
        <>
          {loadingCrew && <p className="hud__muted">Boarding…</p>}
          {boarded?.captain && (
            <>
              <div className="hud__label">Captain</div>
              <p className="fleet__captain">
                {/* The captain's page: the events they run, next and before */}
                <Link to={`/organizers/${encodeURIComponent(artistSlug(boarded.captain))}`} state={{ name: boarded.captain }}>
                  {boarded.captain} →
                </Link>
                {boarded.captainUrl && (
                  <> <a href={boarded.captainUrl} target="_blank" rel="noopener noreferrer" aria-label={`${boarded.captain} website`}>↗</a></>
                )}
              </p>
            </>
          )}
          {boarded && boarded.crew.length > 0 && (
            <>
              <div className="hud__label">Crew · {boarded.crew.length} on board</div>
              <div className="hud__chips">
                {boarded.crew.map((m) => {
                  const isFollowed = followedSlugs.has(artistSlug(m.name));
                  return (
                    <button key={m.slug ?? m.name} className="hud__chip" onClick={() => onSelectCrew(m)}
                      style={m.color ? { borderColor: m.color } : undefined}
                      title={(isFollowed ? 'You follow them. ' : '') + (m.color ? 'On the map: open their satellite' : 'Where else do they play?')}>
                      {isFollowed && '★ '}{m.name}
                    </button>
                  );
                })}
              </div>
              <p className="hud__muted fleet__hint">The crew orbits the ship. Colored names are on the map.</p>
            </>
          )}
          {boarded && boarded.crew.length === 0 && <p className="hud__muted">No line-up published yet.</p>}
        </>
      )}
    </HudShell>
  );
}

const TIME = new Intl.DateTimeFormat('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** One ship per genre of the timetable: which sail when, which one is docked at its star right now */
function LiveFleetSection({ fleet, previewing, onPreview, onSelect }: {
  fleet: LiveFleet; previewing: boolean; onPreview?: () => void; onSelect: (genreId: string) => void;
}) {
  const now = Date.now();
  const playing = new Set(playingNow(fleet, now).map((s) => s.genreId));
  const live = now >= fleet.launch && now <= fleet.end;
  return (
    <>
      <div className="hud__label">Fleet · {fleet.ships.length} genres {live && <span className="fleet__live">● live</span>}</div>
      <ul className="fleet__ships">
        {fleet.ships.map((ship) => {
          const genre = genreById[ship.genreId];
          return (
            <li key={ship.genreId} style={{ ['--c' as string]: data.families[genre.family].color }}>
              <button className="hud__chip" onClick={() => onSelect(ship.genreId)}>
                {playing.has(ship.genreId) ? '▸ ' : ''}{genre.name}
              </button>
              <span className="fleet__when">{TIME.format(ship.arrive)}–{TIME.format(ship.leave).split(' ')[1]}</span>
              <span className="fleet__who">{ship.artists.slice(0, 3).join(', ')}{ship.artists.length > 3 ? '…' : ''}</span>
            </li>
          );
        })}
      </ul>
      <p className="hud__muted fleet__hint">
        {live ? 'Each ship docks at its star while its genre plays.' : 'The fleet sets out an hour before the first set.'} Times in your time zone.
      </p>
      {onPreview && (
        <button className="fleet__board" onClick={onPreview} disabled={previewing}>
          {previewing ? 'Sailing through the night…' : '▶ Preview the night'}
        </button>
      )}
    </>
  );
}
