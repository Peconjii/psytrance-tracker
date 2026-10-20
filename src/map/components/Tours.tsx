import { useState } from 'react';
import { genreById, tours, type Tour } from '../data/types';

interface MenuProps {
  onStart: (t: Tour) => void;
}

/** Topbar button that opens the list of guided tours */
export function ToursMenu({ onStart }: MenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tours">
      <button className="tours__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Tours ▾</button>
      {open && (
        <ul className="tours__list">
          {tours.map((t) => (
            <li key={t.id}>
              <button onClick={() => { setOpen(false); onStart(t); }}>
                <b>{t.title}</b>
                <small>{t.stops.length - 1} jumps · {t.blurb}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface BarProps {
  tour: Tour;
  index: number;
  onGo: (i: number) => void;
  onExit: () => void;
}

/** Bottom card that narrates the current tour stop */
export function TourBar({ tour, index, onGo, onExit }: BarProps) {
  const stop = tour.stops[index];
  const last = index === tour.stops.length - 1;
  return (
    <section className="tourbar" aria-label={`Tour: ${tour.title}`}>
      <div className="tourbar__head">
        <span className="tourbar__tag">// TOUR · {tour.title.toUpperCase()} · {index + 1}/{tour.stops.length}</span>
        <button className="tourbar__exit" onClick={onExit} aria-label="Exit tour">×</button>
      </div>
      <h3>{genreById[stop.genre].name}</h3>
      <p>{stop.text}</p>
      <div className="tourbar__nav">
        <button onClick={() => onGo(index - 1)} disabled={index === 0}>← Back</button>
        <ol className="tourbar__dots">
          {tour.stops.map((s, i) => (
            <li key={s.genre}>
              <button className={i === index ? 'is-current' : i < index ? 'is-done' : undefined}
                onClick={() => onGo(i)} aria-label={`Stop ${i + 1}: ${genreById[s.genre].name}`} />
            </li>
          ))}
        </ol>
        {last
          ? <button className="tourbar__next" onClick={onExit}>Finish ✓</button>
          : <button className="tourbar__next" onClick={() => onGo(index + 1)}>Next →</button>}
      </div>
    </section>
  );
}
