import { useMemo, useState } from 'react';
import { data, festivals } from '../data/types';

interface Props {
  onSelect: (id: string, artist?: string) => void;
  onOpenLabel: (name: string) => void;
  onOpenFestival: (id: string) => void;
}

interface Hit {
  id: string;
  label: string;
  kind: string;
  artist?: string;
  /** Labels and festivals open their own views instead of a system */
  open?: () => void;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Search across genres, artists, labels and tracks; the camera flies to the system */
export function Search({ onSelect, onOpenLabel, onOpenFestival }: Props) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const hits = useMemo<Hit[]>(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    const seen = new Set<string>();
    // Rank: names that start with the query first, then by kind (genre, festival, label, artist, track)
    const ranked: { hit: Hit; score: number }[] = [];
    const add = (id: string, label: string, kind: string, artist?: string, open?: () => void, rank = 4) => {
      const key = `${id}|${label}`;
      const l = norm(label);
      if (seen.has(key) || !l.includes(n)) return;
      seen.add(key);
      ranked.push({ hit: { id, label, kind, artist, open }, score: (l.startsWith(n) ? 0 : 10) + rank });
    };
    for (const g of data.genres) add(g.id, g.name, 'GENRE', undefined, undefined, 0);
    for (const g of data.genres) {
      g.artists.forEach((a) => add(g.id, a, 'ARTIST · ' + g.name, a, undefined, 3));
      g.labels.forEach((l) => add('label', l, 'LABEL', undefined, () => onOpenLabel(l), 2));
      g.tracks.forEach((t) => add(g.id, `${t.title} · ${t.artist}`, g.name));
    }
    for (const f of festivals) add(f.id, f.name, 'FESTIVAL · ' + f.country, undefined, () => onOpenFestival(f.id), 1);
    return ranked.sort((a, b) => a.score - b.score).slice(0, 8).map((r) => r.hit);
  }, [q, onOpenLabel, onOpenFestival]);

  const pick = (h: Hit) => { if (h.open) h.open(); else onSelect(h.id, h.artist); setQ(''); setActive(0); };

  return (
    <div className="search">
      <input
        type="search"
        placeholder="Search genre, artist, label…"
        aria-label="Search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && hits[active]) pick(hits[active]);
          if (e.key === 'Escape') setQ('');
        }}
      />
      {hits.length > 0 && (
        <ul className="search__hits" role="listbox">
          {hits.map((h, i) => (
            <li key={`${h.id}|${h.label}`} role="option" aria-selected={i === active}>
              <button onMouseDown={(e) => { e.preventDefault(); pick(h); }} onMouseEnter={() => setActive(i)}>
                <span>{h.label}</span><small>{h.kind}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
