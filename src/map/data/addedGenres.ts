import { fetchAddedGenres } from '../../api/backend.js';
import { data, genreById, type FamilyId, type Genre } from './types';

// Genres (stars) admins added to the galaxy from Admin -> Galaxy (the backend's AddedGenres): put into the map data
// before anything else applies to genres (texts, placements, labels, festivals), so they are drawn and found like the
// ones in genres.json. Loaded once when the site opens; a failed load leaves the map as genres.json has it.

export interface AddedGenre {
  id: string;
  name: string;
  family: FamilyId;
  year: number;
  bpmMin: number | null;
  bpmMax: number | null;
  /** Drawn connected to these; the first is the genre it grew out of */
  links: string[];
  /** More words that name it in stage headers */
  keywords: string[];
  x: number;
  y: number;
}

/** The added genres as the backend last sent them (Admin -> Galaxy lists and edits them) */
export const addedGenres: AddedGenre[] = [];
export const isAddedGenre = (id: string) => addedGenres.some((g) => g.id === id);

const WAIT_MS = 4000;
let loading: Promise<void> | null = null;

/** Puts one added genre into the map data, or updates the one already there */
export function applyAddedGenre(a: AddedGenre) {
  const bpm: [number, number] = [a.bpmMin ?? a.bpmMax ?? 0, a.bpmMax ?? a.bpmMin ?? 0];
  const existing = genreById[a.id];
  if (existing) {
    Object.assign(existing, { name: a.name, family: a.family, year: a.year, x: a.x, y: a.y });
    if (a.bpmMin != null || a.bpmMax != null) existing.bpm = bpm;
  } else {
    const genre: Genre = {
      id: a.id, name: a.name, family: a.family, year: a.year, bpm, size: 1, x: a.x, y: a.y,
      description: '', artists: [], production: { bass: '', kick: '', atmosphere: '' },
      labels: [], countries: [], festivals: [], tracks: [],
    };
    data.genres.push(genre);
    genreById[a.id] = genre;
  }
  // Its lines: from each linked genre to it
  data.links = data.links.filter(([x, y]) => x !== a.id && y !== a.id);
  for (const from of a.links) if (genreById[from]) data.links.push([from, a.id]);
  const at = addedGenres.findIndex((g) => g.id === a.id);
  if (at >= 0) addedGenres[at] = a; else addedGenres.push(a);
}

/** Takes an added genre out of the map data at once (after an admin removed it) */
export function forgetAddedGenre(id: string) {
  const at = data.genres.findIndex((g) => g.id === id);
  if (at >= 0) data.genres.splice(at, 1);
  delete genreById[id];
  data.links = data.links.filter(([x, y]) => x !== id && y !== id);
  const i = addedGenres.findIndex((g) => g.id === id);
  if (i >= 0) addedGenres.splice(i, 1);
}

/** Loads the added genres once; never fails (the map then has the genres of genres.json) */
export function loadAddedGenres(): Promise<void> {
  loading ??= fetchAddedGenres(AbortSignal.timeout(WAIT_MS))
    .then((list: AddedGenre[]) => { for (const g of list) applyAddedGenre(g); })
    .catch((err: unknown) => console.warn('Could not load the genres added to the galaxy', err));
  return loading;
}
