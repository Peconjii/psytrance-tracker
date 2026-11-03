import { Link } from 'react-router-dom';

/** "✎ Fix" in a HUD footer: opens the feedback form about this genre, artist, festival or label */
// compact: only "✎", for a row in a list (a key track); name then says which track
/** "+ Suggest a track" under an artist: the feedback form with the artist filled in and fields for the track */
export function SuggestTrackLink({ artist }: { artist: string }) {
  const params = new URLSearchParams({ kind: 'CORRECTION', about: 'ARTIST', ref: artist, track: '1', from: window.location.pathname + window.location.search });
  return (
    <Link className="hud__suggest" to={`/feedback?${params}`} title={`Know a track by ${artist} that belongs here? Tell us`}>
      + Suggest a track
    </Link>
  );
}

/** "+ Suggest an artist" under a genre's artists: the feedback form with the genre filled in */
export function SuggestArtistLink({ genre }: { genre: string }) {
  const params = new URLSearchParams({ kind: 'CORRECTION', about: 'GENRE', ref: genre, artist: '1', from: window.location.pathname + window.location.search });
  return (
    <Link className="hud__suggest" to={`/feedback?${params}`} title={`Know an artist who belongs in ${genre}? Tell us`}>
      + Suggest an artist
    </Link>
  );
}

export function FixLink({ about, name, compact = false }: { about: 'GENRE' | 'ARTIST' | 'FESTIVAL' | 'LABEL'; name: string; compact?: boolean }) {
  const params = new URLSearchParams({ kind: 'CORRECTION', about, ref: name, from: window.location.pathname + window.location.search });
  return (
    compact ? (
      <Link className="hud__fixrow" to={`/feedback?${params}`} title={`Something wrong with ${name}? Tell us`}
        aria-label={`Report a mistake: ${name}`}>✎</Link>
    ) : (
      <Link className="hud__ext hud__fix" to={`/feedback?${params}`} title="Something wrong or missing here? Tell us">
        ✎ Fix
      </Link>
    )
  );
}
