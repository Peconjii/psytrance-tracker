import api from '../../api/backend.js';
import { genreById } from './types';

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
