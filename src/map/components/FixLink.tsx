import { Link } from 'react-router-dom';

/** "✎ Fix" in a HUD footer: opens the feedback form about this genre, artist, festival or label */
// compact: only "✎", for a row in a list (a key track); name then says which track
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
