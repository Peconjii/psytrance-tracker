import raw from './genres.json';
import artistsRaw from './artists.json';
import toursRaw from './tours.json';
import producerRaw from './producer.json';
import festivalsRaw from './festivals.json';
import appearancesRaw from './appearances.json';
import labelsRaw from './labels.json';
import sourcesRaw from './sources.json';

export type FamilyId = 'roots' | 'goa' | 'prog' | 'dark' | 'chill';

export interface Family {
  name: string;
  color: string;
}

export interface Genre {
  id: string;
  name: string;
  family: FamilyId;
  year: number;
  bpm: [number, number];
  /** Relative star size (popularity) */
  size: number;
  /** Position in galaxy world coordinates */
  x: number;
  y: number;
  description: string;
  artists: string[];
  /** How it sounds: bass type, kick and atmosphere */
  production: { bass: string; kick: string; atmosphere: string };
  labels: string[];
  countries: string[];
  festivals: string[];
  tracks: Track[];
}

export interface Track {
  artist: string;
  title: string;
  /** Earliest release year per MusicBrainz; omitted when unreliable */
  year?: number;
  /** YouTube video ID for the embedded player */
  youtube?: string;
  /** A well-known classic: used for a first-time quiz so newcomers get tracks they may recognise */
  famous?: boolean;
}

export interface MapData {
  families: Record<FamilyId, Family>;
  genres: Genre[];
  links: [string, string][];
}

export const data = raw as MapData;
export const genreById = Object.fromEntries(data.genres.map((g) => [g.id, g])) as Record<string, Genre>;

/** Artist profile from MusicBrainz; fields are omitted when no reliable match was found */
export interface ArtistProfile {
  country?: string;
  /** Year the project started (groups only; for solo artists MusicBrainz stores a birth date) */
  since?: number;
  albums: { title: string; year: number }[];
}

export const artists = artistsRaw as Record<string, ArtistProfile>;
export const genresOfArtist = (name: string) => data.genres.filter((g) => g.artists.includes(name));
export const tracksOfArtist = (name: string) =>
  data.genres.flatMap((g) => g.tracks)
    .filter((t) => t.artist === name || t.artist.split(/ & |, | x | vs\.? | ft\.? | feat\.? /i).includes(name));

export const WORLD = { width: 2500, height: 1950 };

export interface TourStop {
  genre: string;
  text: string;
  /** Title of a track from that genre's `tracks`, played when the stop opens */
  track?: string;
}

export interface Tour {
  id: string;
  title: string;
  blurb: string;
  stops: TourStop[];
}

export const tours = toursRaw as Tour[];
export const stopTrack = (s: TourStop) => genreById[s.genre].tracks.find((t) => t.title === s.track);

/** Typical production notes per genre: rules of thumb, not hard data */
export interface ProducerNotes {
  tempo: string;
  groove: string;
  structure: string;
  sounds: string;
  tip: string;
  plugins: string;
}

export const producerNotes = producerRaw as Record<string, ProducerNotes>;

const pickOne = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
/** Psy genres with at least one playable track (the roots are left out of the quiz and surprise jumps) */
export const playableGenres = () => data.genres.filter((g) => g.family !== 'roots' && g.tracks.some((t) => t.youtube));
/** A random playable track from anywhere on the map */
export function randomTrack(): { genre: Genre; track: Track } {
  const genre = pickOne(playableGenres());
  return { genre, track: pickOne(genre.tracks.filter((t) => t.youtube)) };
}

/** Every well-known classic on the map, with its genre */
export const famousTracks = () =>
  playableGenres().flatMap((genre) => genre.tracks.filter((t) => t.famous && t.youtube).map((track) => ({ genre, track })));

export interface Festival {
  id: string;
  name: string;
  country: string;
  /** First edition, only where it is well documented */
  since?: number;
  description: string;
  /** Station position in world coordinates, placed by hand in the gaps between systems */
  x: number;
  y: number;
  genres: string[];
}

export const festivals = festivalsRaw as Festival[];
export const festivalById = Object.fromEntries(festivals.map((f) => [f.id, f])) as Record<string, Festival>;
/** Genres that list a label: the label's constellation */
export const genresOfLabel = (label: string) => data.genres.filter((g) => g.labels.includes(label));

/** A festival set found on YouTube: the evidence that an artist played that station */
export interface Appearance {
  festival: string;
  /** YouTube video of the set; missing when the evidence is a published line-up */
  video?: string;
  title: string;
}

export const appearances = appearancesRaw as Record<string, Appearance[]>;
export const artistsAtFestival = (id: string) =>
  Object.entries(appearances).filter(([, xs]) => xs.some((x) => x.festival === id)).map(([name]) => name).sort();

/** Record label profile: country and first year from MusicBrainz, artists = map artists with releases on the label */
export interface LabelProfile {
  country?: string;
  since?: number;
  artists: string[];
  /** Marker position in world coordinates, placed near the label's systems */
  x: number;
  y: number;
}

export const labels = labelsRaw as Record<string, LabelProfile>;
export const labelsOfArtist = (name: string) => Object.keys(labels).filter((l) => labels[l].artists.includes(name)).sort();

/** How well an artist's placement in a genre is backed by MusicBrainz / Last.fm genre tags */
export type PlacementCheck = 'confirmed' | 'related' | 'unconfirmed' | 'nodata';

/** Where to double-check an artist, and what the public genre tags say */
export interface ArtistSources {
  musicbrainz?: string;
  discogs?: number;
  lastfm?: string;
  tags: string[];
  check: Record<string, PlacementCheck>;
  /** Genres the tags point to that the artist is not placed in */
  suggest: string[];
}

export const sources = sourcesRaw as Record<string, ArtistSources>;
