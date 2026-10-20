import { data, genreById, producerNotes, type Genre, type Track } from '../data/types';

interface Props {
  ids: [string, string];
  playing: Track | null;
  onChange: (a: string, b: string) => void;
  onPlay: (t: Track) => void;
  onClose: () => void;
}

const BPM_MIN = 60;
const BPM_MAX = 200;
const pct = (bpm: number) => ((bpm - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100;

const ROWS: [string, (g: Genre) => string | undefined][] = [
  ['BASS', (g) => g.production.bass],
  ['KICK', (g) => g.production.kick],
  ['ATMOSPHERE', (g) => g.production.atmosphere],
  ['GROOVE', (g) => producerNotes[g.id]?.groove],
  ['STRUCTURE', (g) => producerNotes[g.id]?.structure],
];

/** Two genres side by side: tempo, sound and a track from each to hear the difference */
export function Compare({ ids, playing, onChange, onPlay, onClose }: Props) {
  const [a, b] = ids.map((id) => genreById[id]);
  const options = data.genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>);
  const color = (g: Genre) => data.families[g.family].color;
  const sample = (g: Genre) => g.tracks.find((t) => t.youtube);

  return (
    <section className="tourbar compare" aria-label={`Compare ${a.name} and ${b.name}`}>
      <div className="tourbar__head">
        <span className="tourbar__tag">// COMPARE SYSTEMS</span>
        <button className="tourbar__exit" onClick={onClose} aria-label="Close comparison">×</button>
      </div>

      <div className="compare__grid">
        <span />
        {[a, b].map((g, i) => (
          <div key={i} className="compare__pick" style={{ ['--c' as string]: color(g) }}>
            <select value={g.id} aria-label={`System ${i + 1}`}
              onChange={(e) => (i === 0 ? onChange(e.target.value, b.id) : onChange(a.id, e.target.value))}>{options}</select>
            <small>≈{g.year} · {data.families[g.family].name}</small>
          </div>
        ))}

        <span className="compare__label">TEMPO</span>
        {[a, b].map((g, i) => (
          <div key={i} className="compare__bpm" style={{ ['--c' as string]: color(g) }}>
            <div className="compare__track"><i style={{ left: `${pct(g.bpm[0])}%`, width: `${pct(g.bpm[1]) - pct(g.bpm[0])}%` }} /></div>
            <b>{g.bpm[0]}–{g.bpm[1]} BPM</b>
          </div>
        ))}

        {ROWS.map(([label, get]) => (
          <div key={label} className="compare__row">
            <span className="compare__label">{label}</span>
            <p>{get(a) ?? '—'}</p>
            <p>{get(b) ?? '—'}</p>
          </div>
        ))}

        <span className="compare__label">LISTEN</span>
        {[a, b].map((g, i) => {
          const t = sample(g);
          return t ? (
            <button key={i} className={playing?.youtube === t.youtube ? 'compare__play is-playing' : 'compare__play'}
              style={{ ['--c' as string]: color(g) }} onClick={() => onPlay(t)}>
              {playing?.youtube === t.youtube ? '♪' : '▶'} <b>{t.title}</b> · {t.artist}
            </button>
          ) : <span key={i} className="hud__muted">—</span>;
        })}
      </div>

      <div className="tourbar__nav">
        <span className="quiz__hint">Bar shows each tempo range on a 60–200 BPM scale</span>
        <button onClick={() => onChange(b.id, a.id)}>⇄ Swap</button>
      </div>
    </section>
  );
}
