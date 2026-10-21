import { Fragment } from 'react';
import { data, genreById, producerNotes, type Genre, type ProducerNotes } from '../data/types';

const ROWS = [
  ['tempo', 'TEMPO'],
  ['groove', 'KICK & BASS'],
  ['structure', 'STRUCTURE'],
  ['sounds', 'SOUNDS & FX'],
  ['plugins', 'TOOLS'],
] as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Tempo axis of the sheet: from downtempo to the fastest psycore
const BPM_MIN = 60;
const BPM_MAX = 210;

/**
 * The arrangement as bar counts when the notes spell it out ("intro 32 → main 64 → ..."),
 * or null when they describe it in words only ("Hypnotic and continuous").
 */
function arrangement(structure: string): { name: string; bars: number }[] | null {
  const parts = structure.split('→').map((p) => p.match(/([A-Za-z][A-Za-z ]*?)\s+(\d+)\b/));
  if (parts.length < 3 || parts.some((p) => !p)) return null;
  return parts.map((p) => ({ name: p![1].trim().replace(/^.*?:\s*/, '').split(' ').pop()!.toLowerCase(), bars: Number(p![2]) }));
}

/**
 * One beat of the typical kick and bass pattern, in 16ths: K = kick, b = bass, . = rest.
 * Only for the two patterns the notes name outright; anything else (breakbeats, dub, free-form) gets none.
 */
function beatPattern(groove: string): { pattern: string; name: string } | null {
  if (/off-?beat bass/i.test(groove)) return { pattern: 'K.b.', name: 'Offbeat: the bass sits on the "and" between kicks' };
  if (/breakbeat|half-time|no kick/i.test(groove)) return null;
  if (/rolling|16th/i.test(groove)) return { pattern: 'Kbbb', name: 'Rolling / 16th: kick, then three bass notes per beat' };
  return null;
}

function sheetHtml(g: Genre, n: ProducerNotes) {
  const fam = data.families[g.family];
  const from = data.links.filter(([, b]) => b === g.id).map(([a]) => genreById[a]);
  const into = data.links.filter(([a]) => a === g.id).map(([, b]) => genreById[b]);
  const left = ((g.bpm[0] - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100;
  const width = Math.max(1.5, ((g.bpm[1] - g.bpm[0]) / (BPM_MAX - BPM_MIN)) * 100);
  const ticks = [80, 100, 120, 140, 160, 180, 200]
    .map((b) => `<span style="left:${((b - BPM_MIN) / (BPM_MAX - BPM_MIN)) * 100}%">${b}</span>`).join('');

  const avgBpm = Math.round((g.bpm[0] + g.bpm[1]) / 2);
  const parts = arrangement(n.structure);
  const total = parts?.reduce((s, p) => s + p.bars, 0) ?? 0;
  const strip = parts
    ? `<div class="strip">${parts.map((p) => `<div class="seg seg--${/break/.test(p.name) ? 'break' : /intro|outro/.test(p.name) ? 'edge' : /build/.test(p.name) ? 'build' : 'main'}" style="flex:${p.bars}"><b>${esc(p.name)}</b><span>${p.bars}</span></div>`).join('')}</div>
       <p class="small">${total} bars in total: about ${(total * 4 / avgBpm).toFixed(1)} minutes at ${avgBpm} BPM.</p>`
    : '';

  const beat = beatPattern(n.groove);
  const grid = beat
    ? `<div class="grid">${[0, 1, 2, 3].map(() => beat.pattern.split('').map((c, i) =>
        `<i class="${c === 'K' ? 'k' : c === 'b' ? 'b' : ''}${i === 0 ? ' beat' : ''}">${c === 'K' ? 'K' : c === 'b' ? 'B' : ''}</i>`).join('')).join('')}</div>
       <p class="small">${esc(beat.name)}. One bar of 16ths, beats marked.</p>`
    : '';

  const refs = g.tracks.slice(0, 8).map((t) => `<li><b>${esc(t.title)}</b> <span>${esc(t.artist)}${t.year ? ` · ${t.year}` : ''}</span></li>`).join('');
  const chips = (gs: Genre[]) => gs.map((x) => `<span class="chip" style="border-color:${data.families[x.family].color}">${esc(x.name)}</span>`).join('') || '<span class="small">–</span>';

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.name)} · producer cheat sheet · Map of Psy</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 12.5px/1.5 'IBM Plex Sans', system-ui, sans-serif; color: #15131f; max-width: 186mm; margin: 0 auto; padding: 16px 0; }
  .mono, .tag, .label, .small, .grid i, .strip span, .ticks span { font-family: 'JetBrains Mono', ui-monospace, monospace; }
  header { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; padding: 0 0 12px 14px; border-left: 5px solid ${fam.color}; }
  .tag { font-size: 10px; letter-spacing: .16em; color: #6b6585; text-transform: uppercase; }
  h1 { font: 800 30px/1.05 'Unbounded', sans-serif; margin: 4px 0 6px; letter-spacing: .02em; }
  .desc { margin: 0; color: #3b3650; max-width: 120mm; }
  .stats { display: grid; grid-template-columns: repeat(3, auto); gap: 6px; }
  .stat { border: 1px solid #d8d4e8; padding: 6px 10px; text-align: right; }
  .stat b { display: block; font: 600 16px 'JetBrains Mono', monospace; }
  .stat span { font: 9px 'JetBrains Mono', monospace; letter-spacing: .14em; color: #6b6585; }
  section { margin-top: 14px; break-inside: avoid; }
  .label { font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: #6b6585; margin: 0 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e4e1ef; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
  .small { font-size: 10px; color: #6b6585; margin: 4px 0 0; }
  .tempo { position: relative; height: 14px; background: #efedf6; margin: 4px 0 2px; }
  .tempo div { position: absolute; top: 0; bottom: 0; background: ${fam.color}; }
  .ticks { position: relative; height: 14px; }
  .ticks span { position: absolute; transform: translateX(-50%); font-size: 9px; color: #8a84a3; }
  .sound { display: grid; grid-template-columns: 74px 1fr; gap: 3px 10px; margin: 0; }
  .sound dt { font: 600 9.5px 'JetBrains Mono', monospace; letter-spacing: .12em; color: #6b6585; padding-top: 2px; }
  .sound dd { margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; margin-top: 4px; }
  .grid i { font-style: normal; height: 22px; display: grid; place-items: center; font-size: 10px; font-weight: 600; background: #f4f2fa; border-top: 2px solid transparent; }
  .grid i.beat { border-top-color: #15131f; }
  .grid i.k { background: #15131f; color: #fff; }
  .grid i.b { background: ${fam.color}; color: #15131f; }
  .strip { display: flex; gap: 2px; margin-top: 4px; }
  .seg { min-width: 0; padding: 5px 6px; display: flex; justify-content: space-between; align-items: baseline; gap: 4px; font-size: 10.5px; }
  .seg b { font-weight: 600; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .seg span { font-size: 9px; opacity: .75; }
  .seg--main { background: ${fam.color}; } .seg--build { background: ${fam.color}99; }
  .seg--break { background: #d9d5e8; } .seg--edge { background: #efedf6; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px 6px 0; border-bottom: 1px solid #ebe8f3; }
  th { width: 92px; font: 600 9.5px 'JetBrains Mono', monospace; letter-spacing: .12em; color: #6b6585; padding-top: 8px; }
  .tip { margin: 0; padding: 10px 12px; border-left: 4px solid ${fam.color}; background: #f6f4fb; }
  .tip b { font: 600 9.5px 'JetBrains Mono', monospace; letter-spacing: .16em; display: block; color: #6b6585; margin-bottom: 2px; }
  ol { margin: 0; padding-left: 18px; columns: 2; column-gap: 18px; }
  li { break-inside: avoid; margin-bottom: 3px; } li span { color: #6b6585; }
  .chip { display: inline-block; border: 1px solid; border-left-width: 4px; padding: 1px 7px; margin: 0 4px 4px 0; font-size: 11px; }
  .meta p { margin: 0 0 4px; } .meta b { font: 600 9.5px 'JetBrains Mono', monospace; letter-spacing: .12em; color: #6b6585; margin-right: 6px; }
  footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e4e1ef; display: flex; justify-content: space-between; font: 9.5px 'JetBrains Mono', monospace; color: #8a84a3; }
  @media screen { body { padding: 24px; } }
</style></head><body>
<header>
  <div>
    <div class="tag">// Producer cheat sheet · ${esc(fam.name)}</div>
    <h1>${esc(g.name)}</h1>
    <p class="desc">${esc(g.description)}</p>
  </div>
  <div class="stats">
    <div class="stat"><b>${g.bpm[0]}–${g.bpm[1]}</b><span>BPM</span></div>
    <div class="stat"><b>${g.year}</b><span>SINCE</span></div>
    <div class="stat"><b>${g.tracks.length}</b><span>REF TRACKS</span></div>
  </div>
</header>

<section>
  <p class="label">Tempo · ${esc(n.tempo)}</p>
  <div class="tempo"><div style="left:${left}%;width:${width}%"></div></div>
  <div class="ticks">${ticks}</div>
</section>

<section class="cols">
  <div>
    <p class="label">How it sounds</p>
    <dl class="sound">
      <dt>BASS</dt><dd>${esc(g.production.bass)}</dd>
      <dt>KICK</dt><dd>${esc(g.production.kick)}</dd>
      <dt>MOOD</dt><dd>${esc(g.production.atmosphere)}</dd>
    </dl>
  </div>
  <div>
    <p class="label">Kick &amp; bass</p>
    <p style="margin:0">${esc(n.groove)}</p>
    ${grid}
  </div>
</section>

<section>
  <p class="label">Arrangement</p>
  ${strip}
  <p style="margin:${parts ? '6px' : '0'} 0 0">${esc(n.structure)}</p>
</section>

<section>
  <p class="label">In the studio</p>
  <table>
    <tr><th>SOUNDS &amp; FX</th><td>${esc(n.sounds)}</td></tr>
    <tr><th>TOOLS</th><td>${esc(n.plugins)}</td></tr>
  </table>
</section>

<section><p class="tip"><b>STUDIO TIP</b>${esc(n.tip)}</p></section>

<section>
  <p class="label">Reference tracks · listen before you start</p>
  <ol>${refs}</ol>
</section>

<section class="cols">
  <div>
    <p class="label">Grew out of</p>${chips(from)}
    <p class="label" style="margin-top:8px">Led to</p>${chips(into)}
  </div>
  <div class="meta">
    <p class="label">Scene</p>
    ${g.labels.length ? `<p><b>LABELS</b>${esc(g.labels.join(', '))}</p>` : ''}
    ${g.countries.length ? `<p><b>WHERE</b>${esc(g.countries.join(', '))}</p>` : ''}
    ${g.festivals.length ? `<p><b>FESTIVALS</b>${esc(g.festivals.join(', '))}</p>` : ''}
    ${g.artists.length ? `<p><b>ARTISTS</b>${esc(g.artists.slice(0, 8).join(', '))}</p>` : ''}
  </div>
</section>

<footer><span>Map of Psy · psy galaxy + event tracker</span><span>Rules of thumb: many great tracks break them.</span></footer>
<script>document.fonts.ready.then(() => setTimeout(() => window.print(), 150));</script>
</body></html>`;
}

/** Opens a print-friendly one-page cheat sheet for the studio (save as PDF from the print dialog) */
function printSheet(g: Genre) {
  const n = producerNotes[g.id];
  const w = window.open('', '_blank');
  if (!w || !n) return;
  w.document.write(sheetHtml(g, n));
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
