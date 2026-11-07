import api from '../../api/backend.js';
import { data, genreById } from './types';

/** How far ahead the map shows events, as the backend names it */
export type EventPeriod = 'WEEK' | 'MONTH';

/** One Map of Psy genre of an event: its part of the event (shares add up to 1) and the best evidence for it */
export interface GenreShare {
  genreId: string;
  share: number;
  source: 'ARTIST' | 'STAGE' | 'KEYWORD';
}

/** An upcoming Goabase event with the map genres the backend worked out from its line-up (GET /api/map/events) */
export interface MapEvent {
  id: number;
  nameParty: string;
  nameType: string;
  nameTown: string;
  nameCountry: string;
  dateStart: string | null;
  dateEnd: string | null;
  /** False until the backend has read the line-up; then an empty genre list means "not known yet" */
  lineUpRead: boolean;
  genres: GenreShare[];
  /** An admin features it: a mark on the map and first in the departures, with an optional note */
  featured: boolean;
  featuredNote: string | null;
  /** A festival (kind Festival, three days or more): a bigger ship, on the map until it is over, whatever the period */
  festival: boolean;
  /** The festival station it is an edition of: a dashed line to it on hover */
  festivalId: string | null;
  /** On the map only because it is a festival: outside the period the ship console shows, so drawn a little fainter */
  outside?: boolean;
}

export async function fetchMapEvents(period: EventPeriod): Promise<MapEvent[]> {
  const { data } = await api.get('/api/map/events', { params: { period } });
  // Genres the map doesn't have (an older or newer genres.json on the backend) are dropped
  return (data as MapEvent[]).map((e) => ({ ...e, genres: e.genres.filter((g) => genreById[g.genreId]) }));
}

/** Every upcoming festival with a known genre, however far ahead (GET /api/map/festivals) */
export async function fetchMapFestivals(): Promise<MapEvent[]> {
  const { data } = await api.get('/api/map/festivals');
  return (data as MapEvent[]).map((e) => ({ ...e, genres: e.genres.filter((g) => genreById[g.genreId]) }))
    .filter((e) => e.genres.length);
}

/**
 * The ships of the map: the period's events, plus every festival outside the period (marked `outside`); no ships at
 * all when the console is off (events null)
 */
export function withFestivals(events: MapEvent[] | null, festivals: MapEvent[]): MapEvent[] | null {
  if (!events) return null;
  const inPeriod = new Set(events.map((e) => e.id));
  return [...events, ...festivals.filter((f) => !inPeriod.has(f.id)).map((f) => ({ ...f, outside: true }))];
}

/** Where a ship sits: the share-weighted middle of its genres' stars, or null when the genre is unknown */
export function shipPosition(e: MapEvent): { x: number; y: number } | null {
  if (!e.genres.length) return null;
  const total = e.genres.reduce((sum, g) => sum + g.share, 0);
  let x = 0, y = 0;
  for (const g of e.genres) {
    x += (genreById[g.genreId].x * g.share) / total;
    y += (genreById[g.genreId].y * g.share) / total;
  }
  return { x, y };
}

/** "Fri 24 Oct" or "Fri 24 – Sun 26 Oct" */
export function eventDates(e: MapEvent): string {
  if (!e.dateStart) return 'Date unknown';
  const fmt = (d: string, month: boolean) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB',
    { weekday: 'short', day: 'numeric', ...(month ? { month: 'short' } : {}) });
  if (!e.dateEnd || e.dateEnd === e.dateStart) return fmt(e.dateStart, true);
  return `${fmt(e.dateStart, false)} – ${fmt(e.dateEnd, true)}`;
}

/** A boarded ship: the event's organizer (its captain) and its line-up (its crew) */
export interface Boarded {
  id: number;
  captain: string | null;
  captainUrl: string | null;
  crew: { name: string; slug: string | null; color: string | null }[];
}

/** The same slug the backend gives line-up artists: "Ace Ventura" -> "ace-ventura", "Ëlement" -> "element" */
export function artistSlug(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}

// Map artists by slug, so a line-up name finds its satellite however the organizer wrote it.
// Rebuilt when the placements come from the backend (see placements.ts).
const bySlug = new Map<string, { name: string; genreId: string }>();
export function indexMapArtists() {
  bySlug.clear();
  for (const g of data.genres) for (const name of g.artists) if (!bySlug.has(artistSlug(name))) bySlug.set(artistSlug(name), { name, genreId: g.id });
}
indexMapArtists();

/** The map artist with this slug and the first genre they are placed in, or null when they aren't on the map */
export function mapArtistBySlug(slug: string): { name: string; genreId: string } | null {
  return bySlug.get(slug) ?? null;
}

/** Ships closer than this to a star are moved out of the star's glow */
const NEAR_STAR = 60;
const SHIP_OFFSET = 78;
/** Ships within one grid cell of each other form a fleet */
const FLEET_GRID = 34;
/** Where events of unknown genre wait: open space in the upper left, between psychedelic rock and Detroit techno */
export const HARBOUR = { x: 200, y: 700 };

/** Ships parked at the same spot, and the genre with the biggest share across them (it sets their color) */
export interface FleetSpot {
  events: MapEvent[];
  x: number;
  y: number;
  mainGenre: string;
}

/** Where every event with a known genre sits on the map, grouped into fleets. Used by the map and the radar. */
export function buildFleets(events: MapEvent[]): FleetSpot[] {
  const groups = new Map<string, { events: MapEvent[]; x: number; y: number }>();
  for (const e of events) {
    const p = shipPosition(e);
    if (!p) continue;
    // A ship right on a star would hide in its glow: move it out, away from the star
    const top = genreById[e.genres[0].genreId];
    const dx = p.x - top.x, dy = p.y - top.y;
    const d = Math.hypot(dx, dy);
    if (d < NEAR_STAR) {
      const [ux, uy] = d > 1 ? [dx / d, dy / d] : [Math.SQRT1_2, -Math.SQRT1_2];
      p.x = top.x + ux * SHIP_OFFSET;
      p.y = top.y + uy * SHIP_OFFSET;
    }
    // A festival sails on its own, never in a fleet of parties
    const key = e.festival ? `festival:${e.id}` : `${Math.round(p.x / FLEET_GRID)}:${Math.round(p.y / FLEET_GRID)}`;
    const group = groups.get(key) ?? { events: [], x: p.x, y: p.y };
    group.events.push(e);
    groups.set(key, group);
  }
  const spots = [...groups.values()].map((group) => {
    const weight: Record<string, number> = {};
    for (const e of group.events) for (const g of e.genres) weight[g.genreId] = (weight[g.genreId] ?? 0) + g.share;
    return { ...group, mainGenre: Object.entries(weight).sort((a, b) => b[1] - a[1])[0][0] };
  });
  return keepApart(spots);
}

/** How much room a spot needs around it: a festival is drawn bigger than a fleet, a fleet bigger than one ship */
const roomOf = (spot: FleetSpot) => (spot.events.length === 1 && spot.events[0].festival ? 34 : spot.events.length > 1 ? 20 : 14);
/** How hard a spot is to push: a festival barely moves, so the parties around it make way */
const weightOf = (spot: FleetSpot) => (spot.events.length === 1 && spot.events[0].festival ? 4 : spot.events.length > 1 ? 2 : 1);
const APART_ROUNDS = 24;

/**
 * Spots that would cover each other (a festival over a party, two fleets side by side) are pushed apart until each
 * has its room, the lighter one moving more. Every ship stays close to where its genres put it. Deterministic, so
 * the map and the radar agree and a ship doesn't jump between renders.
 */
export function keepApart(spots: FleetSpot[]): FleetSpot[] {
  const out = spots.map((s) => ({ ...s }));
  for (let round = 0; round < APART_ROUNDS; round++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        const need = roomOf(a) + roomOf(b);
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= need) continue;
        // Right on top of each other: part them along a fixed direction that depends on the pair
        if (d < 0.01) { const t = (i * 7 + j * 13) % 8 * (Math.PI / 4); dx = Math.cos(t); dy = Math.sin(t); d = 1; }
        const push = need - d;
        const wa = weightOf(a), wb = weightOf(b);
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push * (wb / (wa + wb)); a.y -= uy * push * (wb / (wa + wb));
        b.x += ux * push * (wa / (wa + wb)); b.y += uy * push * (wa / (wa + wb));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
