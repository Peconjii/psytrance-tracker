import api from '../../api/backend.js';
import { genreById } from './types';
import { mapArtistBySlug, shipPosition, type EventPeriod, type MapEvent } from './events';

/** One set of an event's timetable, on the venue clock ("2026-10-24T22:00:00") */
export interface TimetableSet {
  stage: string | null;
  artist: string;
  artistSlug: string;
  startsAt: string;
  endsAt: string | null;
  /** The set's map genre as the backend worked it out (artist, genre named next to the set, or stage) */
  genreId: string | null;
}

export interface Timetable {
  eventId: number;
  manual: boolean;
  /** The venue clock's offset from UTC in minutes; null when unknown (then the viewer's clock is used) */
  utcOffsetMinutes: number | null;
  sets: TimetableSet[];
}

/** The timetables of the period's events that have set times (GET /api/map/timetables) */
export async function fetchMapTimetables(period: EventPeriod): Promise<Timetable[]> {
  const { data } = await api.get('/api/map/timetables', { params: { period } });
  return data as Timetable[];
}

/** A ship of a live fleet: it sails to its genre's star, arrives when the genre starts playing and leaves when it ends */
export interface GenreShip {
  genreId: string;
  /** Where it docks: next to the genre's star */
  x: number;
  y: number;
  /** When the genre starts and stops playing, in ms since 1970 */
  arrive: number;
  leave: number;
  /** Who plays that genre, in order */
  artists: string[];
}

/** An event whose timetable spans two or more map genres: one ship per genre sets out from the event's ship */
export interface LiveFleet {
  eventId: number;
  name: string;
  /** The event's own ship, where the fleet sets out from */
  port: { x: number; y: number };
  /** All ships leave the port together, an hour before the first set */
  launch: number;
  /** After the last set the fleet is gone */
  end: number;
  ships: GenreShip[];
}

const HOUR = 3_600_000;
// A set without an end lasts until the next one, or this long when it is the last one
const LAST_SET = 1.5 * HOUR;
// Ships dock this far from their star, each fleet at its own angle so two fleets don't sit on each other
const DOCK_DISTANCE = 110;

/** A venue-clock time as ms since 1970: with the offset when it's known, else on the viewer's clock */
export function venueTime(local: string, utcOffsetMinutes: number | null): number {
  if (utcOffsetMinutes === null) return new Date(local).getTime();
  const [date, time] = local.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - utcOffsetMinutes * 60_000;
}

/**
 * The live fleets of these events. A set's genre is the genre its artist orbits on the map, else the one the
 * backend found next to the set or in its stage name; sets without a genre are left out. An event needs two genres for a fleet, otherwise it stays one ship.
 */
export function buildLiveFleets(events: MapEvent[], timetables: Timetable[]): LiveFleet[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const fleets: LiveFleet[] = [];
  for (const timetable of timetables) {
    const event = byId.get(timetable.eventId);
    if (!event || timetable.sets.length === 0) continue;
    const times = timetable.sets.map((s) => venueTime(s.startsAt, timetable.utcOffsetMinutes));
    const genres = new Map<string, GenreShip>();
    timetable.sets.forEach((set, i) => {
      // The map's placements win: they may have changed since the backend read the timetable
      const genreId = mapArtistBySlug(set.artistSlug)?.genreId ?? set.genreId ?? undefined;
      if (!genreId || !genreById[genreId]) return;
      const start = times[i];
      const later = times.filter((t) => t > start);
      const end = set.endsAt ? venueTime(set.endsAt, timetable.utcOffsetMinutes)
        : later.length ? Math.min(...later) : start + LAST_SET;
      const ship = genres.get(genreId);
      if (ship) {
        ship.arrive = Math.min(ship.arrive, start);
        ship.leave = Math.max(ship.leave, end);
        ship.artists.push(set.artist);
      } else {
        genres.set(genreId, { genreId, x: 0, y: 0, arrive: start, leave: end, artists: [set.artist] });
      }
    });
    if (genres.size < 2) continue;

    const ships = [...genres.values()].sort((a, b) => a.arrive - b.arrive);
    const angle = ((event.id * 2.399) % (Math.PI * 2));
    for (const ship of ships) {
      const star = genreById[ship.genreId];
      ship.x = star.x + Math.cos(angle) * DOCK_DISTANCE;
      ship.y = star.y + Math.sin(angle) * DOCK_DISTANCE;
    }
    // Without known event genres the fleet sets out from the middle of its own genres
    const port = shipPosition(event) ?? {
      x: ships.reduce((s, sh) => s + genreById[sh.genreId].x, 0) / ships.length,
      y: ships.reduce((s, sh) => s + genreById[sh.genreId].y, 0) / ships.length,
    };
    fleets.push({
      eventId: event.id,
      name: event.nameParty,
      port,
      launch: Math.min(...ships.map((s) => s.arrive)) - HOUR,
      end: Math.max(...ships.map((s) => s.leave)),
      ships,
    });
  }
  return fleets;
}

/** Where a fleet's ship is at this moment, and whether it is under way, docked (its genre is playing) or done */
export function shipState(fleet: LiveFleet, ship: GenreShip, now: number) {
  if (now < fleet.launch || now > fleet.end + HOUR) return { visible: false, x: fleet.port.x, y: fleet.port.y, phase: 'waiting' as const };
  if (now >= ship.arrive) {
    return { visible: true, x: ship.x, y: ship.y, phase: now <= ship.leave ? 'playing' as const : 'done' as const };
  }
  // All ships leave together; the later their genre plays, the slower they sail
  const p = Math.max(0, Math.min(1, (now - fleet.launch) / (ship.arrive - fleet.launch)));
  const ease = p * p * (3 - 2 * p);
  return {
    visible: true,
    x: fleet.port.x + (ship.x - fleet.port.x) * ease,
    y: fleet.port.y + (ship.y - fleet.port.y) * ease,
    phase: 'sailing' as const,
  };
}

/** The genres playing at an event right now, for the ship's panel */
export function playingNow(fleet: LiveFleet, now: number): GenreShip[] {
  return fleet.ships.filter((s) => now >= s.arrive && now <= s.leave);
}
