import { useState } from 'react';
import { genresOfLabel, labels } from '../data/types';

/** Topbar dropdown listing every record label on the map */
export function LabelsMenu({ onOpen }: { onOpen: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const names = Object.keys(labels).sort((a, b) => a.localeCompare(b));
  return (
    <div className="tours">
      <button className="tools__btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Labels ▾</button>
      {open && (
        <ul className="tours__list labels__list">
          {names.map((n) => {
            const l = labels[n];
            const meta = [l.country, l.since, `${genresOfLabel(n).length} systems`, l.artists.length ? `${l.artists.length} artists` : null]
              .filter(Boolean).join(' · ');
            return (
              <li key={n}>
                <button onClick={() => { setOpen(false); onOpen(n); }}>
                  <b>{n}</b>
                  <small>{meta}</small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
