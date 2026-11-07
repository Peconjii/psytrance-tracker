import { fetchDiscography, fetchFestivalSets } from '../../api/backend.js';
import { appearances, artists, data, type Appearance, type ArtistProfile } from './types';
import { artistSlug } from './events';

// Artists' albums, country and first year, and the sets they played at festival stations, from the backend (the
// artists and festivals edit them there); artists.json and appearances.json are what the map started with and stay
// the fallback when the backend can't be reached. Loaded once when the site opens; pages that show them wait for it.

interface Discography { country: string | null; since: number | null; albums: { title: string; year: number | null }[] }
interface FestivalSet { artistSlug: string; artist: string; festivalId: string; festival: string; year: number | null; url: string | null }

const WAIT_MS = 4000;
let loading: Promise<void> | null = null;
const bySlug = new Map<string, ArtistProfile>();

const toProfile = (d: Discography): ArtistProfile => ({
  country: d.country ?? undefined,
  since: d.since ?? undefined,
  albums: d.albums.map((a) => ({ title: a.title, ...(a.year != null ? { year: a.year } : {}) })),
});

/** An artist's country, first year and albums by slug: also artists who aren't on the map */
export function discographyOf(slug: string): ArtistProfile | undefined {
  return bySlug.get(slug);
}

const youtubeId = (url: string | null) => url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)?.[1];

export function loadDiscography(): Promise<void> {
  loading ??= Promise.all([fetchDiscography(AbortSignal.timeout(WAIT_MS)), fetchFestivalSets(AbortSignal.timeout(WAIT_MS))])
    .then(([disco, sets]: [Record<string, Discography>, FestivalSet[]]) => {
      // The map knows artists by name: each map artist gets the discography of their slug
      const mapNames = new Map<string, string>();
      for (const g of data.genres) for (const a of g.artists) mapNames.set(artistSlug(a), a);
      for (const name of Object.keys(artists)) mapNames.set(artistSlug(name), name);
      for (const [slug, d] of Object.entries(disco)) {
        const profile = toProfile(d);
        bySlug.set(slug, profile);
        const name = mapNames.get(slug);
        if (name) artists[name] = profile;
      }
      // The sets replace the bundled ones as a whole: what an artist or festival took out is gone
      for (const key of Object.keys(appearances)) delete appearances[key];
      for (const s of sets) {
        const name = mapNames.get(s.artistSlug) ?? s.artist;
        const video = youtubeId(s.url);
        const set: Appearance = {
          festival: s.festivalId,
          title: `${name} – ${s.festival}${s.year ? ` ${s.year}` : ''}`,
          ...(video ? { video } : {}),
          ...(s.year ? { year: s.year } : {}),
          ...(!video && s.url ? { url: s.url } : {}),
        };
        (appearances[name] ??= []).push(set);
      }
    })
    .catch((err: unknown) => console.warn('Could not load the albums and festival sets, using the bundled ones', err));
  return loading;
}

/** After an artist or festival saved: the next page that shows them loads them again */
export function reloadDiscographyLater() {
  loading = null;
}
