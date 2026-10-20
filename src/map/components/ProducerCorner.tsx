import { Fragment } from 'react';
import { producerNotes, type Genre } from '../data/types';

const ROWS = [
  ['tempo', 'TEMPO'],
  ['groove', 'KICK & BASS'],
  ['structure', 'STRUCTURE'],
  ['sounds', 'SOUNDS & FX'],
  ['plugins', 'TOOLS'],
] as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Opens a print-friendly one-page cheat sheet for the studio (save as PDF from the print dialog) */
function printSheet(g: Genre) {
  const n = producerNotes[g.id];
  const w = window.open('', '_blank');
  if (!w || !n) return;
  const rows = ROWS.map(([k, label]) => `<tr><th>${label}</th><td>${esc(n[k])}</td></tr>`).join('');
  const refs = g.tracks.slice(0, 6).map((t) => `<li>${esc(t.artist)} – ${esc(t.title)}${t.year ? ` (${t.year})` : ''}</li>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.name)} · producer cheat sheet</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; color: #111; max-width: 720px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 26px; margin: 0; } .sub { color: #666; margin: 4px 0 20px; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; } th, td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid #ddd; }
  th { width: 130px; font: 600 11px ui-monospace, monospace; letter-spacing: .08em; color: #555; }
  .tip { margin: 18px 0; padding: 12px 14px; border-left: 3px solid #111; background: #f4f4f4; }
  h2 { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: #555; margin: 22px 0 6px; }
  .note { color: #888; font-size: 12px; margin-top: 24px; }
</style></head><body>
<h1>${esc(g.name)}</h1>
<p class="sub">${g.bpm[0]}–${g.bpm[1]} BPM · Bass: ${esc(g.production.bass)} · Kick: ${esc(g.production.kick)}</p>
<table>${rows}</table>
<p class="tip"><b>Tip:</b> ${esc(n.tip)}</p>
<h2>Reference tracks</h2><ul>${refs}</ul>
<p class="note">Map of Psy · typical rules of thumb; many great tracks break them.</p>
<script>window.onload = () => window.print();</script>
</body></html>`);
  w.document.close();
}

/** Producer notes: what to actually do in the DAW to sound like this genre */
export function ProducerCorner({ genre }: { genre: Genre }) {
  const n = producerNotes[genre.id];
  if (!n) return null;
  return (
    <details className="producer">
      <summary>Producer corner <small>typical, not rules</small></summary>
      <dl className="hud__specs">
        {ROWS.map(([k, label]) => (<Fragment key={k}><dt>{label}</dt><dd>{n[k]}</dd></Fragment>))}
      </dl>
      <p className="producer__tip"><b>Tip</b> {n.tip}</p>
      <button className="hud__share" onClick={() => printSheet(genre)}>Print cheat sheet ⎙</button>
    </details>
  );
}
