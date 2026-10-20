import { Link } from 'react-router-dom';

/** "✎ Fix" in a HUD footer: opens the feedback form about this genre, artist, festival or label */
export function FixLink({ about, name }: { about: 'GENRE' | 'ARTIST' | 'FESTIVAL' | 'LABEL'; name: string }) {
  const params = new URLSearchParams({ kind: 'CORRECTION', about, ref: name, from: window.location.pathname + window.location.search });
  return (
    <Link className="hud__ext hud__fix" to={`/feedback?${params}`} title="Something wrong or missing here? Tell us">
      ✎ Fix
    </Link>
  );
}
