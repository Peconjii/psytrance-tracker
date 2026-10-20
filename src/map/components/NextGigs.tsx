import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArtist } from '../../api/backend.js';
import { artistSlug } from '../data/events';

interface Gig {
  id: number;
  nameParty: string;
  nameTown: string;
  nameCountry: string;
  dateStart: string | null;
}

const SHOWN = 3;

// "Sat 24 Oct"
const gigDate = (value: string | null) => {
  if (!value) return 'TBA';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Where a map artist plays next: their upcoming events found in Goabase line-ups by the tracker */
export function NextGigs({ name }: { name: string }) {
  const slug = artistSlug(name);
  // Tagged with the slug, so another artist's gigs never show while this one loads
  const [loaded, setLoaded] = useState<{ slug: string; gigs: Gig[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchArtist(slug, controller.signal)
      .then((data: { upcomingEvents: Gig[] }) => setLoaded({ slug, gigs: data.upcomingEvents }))
      // 404: no line-up with them was read yet; any other failure also just means "nothing to show"
      .catch(() => { if (!controller.signal.aborted) setLoaded({ slug, gigs: [] }); });
    return () => controller.abort();
  }, [slug]);

  const gigs = loaded?.slug === slug ? loaded.gigs : null;
  return (
    <>
      <div className="hud__label">Next gigs</div>
      {gigs === null ? (
        <p className="hud__muted">Scanning line-ups…</p>
      ) : gigs.length === 0 ? (
        <p className="hud__muted">No upcoming parties with {name} in the line-up yet.</p>
      ) : (
        <>
          <ul className="hud__list">
            {gigs.slice(0, SHOWN).map((g) => (
              <li key={g.id}>
                <Link to={`/events/${g.id}`}>
                  <span className="hud__track"><b>{g.nameParty}</b> · {[g.nameTown, g.nameCountry].filter(Boolean).join(', ')}</span>
                  <span>{gigDate(g.dateStart)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {gigs.length > SHOWN && (
            <Link className="hud__more" to={`/artists/${encodeURIComponent(slug)}`} state={{ name }}>
              All {gigs.length} gigs →
            </Link>
          )}
        </>
      )}
    </>
  );
}
