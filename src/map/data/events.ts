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
}

export async function fetchMapEvents(period: EventPeriod): Promise<MapEvent[]> {
  const { data } = await api.get('/api/map/events', { params: { period } });
  // Genres the map doesn't have (an older or newer genres.json on the backend) are dropped
  return (data as MapEvent[]).map((e) => ({ ...e, genres: e.genres.filter((g) => genreById[g.genreId]) }));
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

// Map artists by slug, so a line-up name finds its satellite however the organizer wrote it
const bySlug = new Map<string, { name: string; genreId: string }>();
for (const g of data.genres) for (const name of g.artists) if (!bySlug.has(artistSlug(name))) bySlug.set(artistSlug(name), { name, genreId: g.id });

/** The map artist with this slug and the first genre they are placed in, or null when they aren't on the map */
export function mapArtistBySlug(slug: string): { name: string; genreId: string } | null {
  return bySlug.get(slug) ?? null;
}
