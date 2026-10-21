import { useState, type CSSProperties, type ReactNode } from 'react';
import { ProducerCorner } from './ProducerCorner';
import { NextGigs } from './NextGigs';
import { FixLink } from './FixLink';
import { HeartButton } from './Playlist';
import type { PlaylistApi } from '../hooks/usePlaylist';
import {
  appearances, artists, artistsAtFestival, data, labels, labelsOfArtist, sources, festivalById, festivals, genreById, genresOfArtist, genresOfLabel, tracksOfArtist,
  type Track,
} from '../data/types';

interface Props {
  genreId: string | null;
  artist: string | null;
  festival: string | null;
  label: string | null;
  playing: Track | null;
  playlist: PlaylistApi;
  /** Play a track; the list (if given) becomes the queue that auto-advances */
  onPlay: (t: Track, list?: Track[]) => void;
  onOpenFestival: (id: string) => void;
  onOpenArtist: (name: string) => void;
  onOpenLabel: (name: string) => void;
  onCompare: (genreId: string) => void;
  onSelect: (id: string) => void;
  onSelectArtist: (name: string | null) => void;
  onClose: () => void;
}

/** HUD container; on phones it is a bottom sheet that can be folded down to its header */
export function HudShell({ className, style, children, foldOnPhone = false }: { className: string; style?: CSSProperties; children: ReactNode; foldOnPhone?: boolean }) {
  // The help panel starts folded on phones, where open it would cover most of the map
  const [folded, setFolded] = useState(() => foldOnPhone && window.matchMedia('(max-width: 700px)').matches);
  return (
    <aside className={folded ? `${className} is-folded` : className} style={style}>
      <button className="hud__fold" onClick={() => setFolded((f) => !f)} aria-expanded={!folded}>
        {folded ? '▴ Show info' : '▾ Hide'}
      </button>
      {children}
    </aside>
  );
}

/** Copies the current address (kept in sync by App) so the view can be shared */
function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button className="hud__share" onClick={() => {
      navigator.clipboard?.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
  );
}

const CHECK_TEXT = {
  confirmed: '✓ confirmed by public tags',
  related: '≈ tagged in this family',
  unconfirmed: '? tags point elsewhere',
  nodata: '– no tags found',
} as const;

const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/** HUD panel styled as a ship's terminal */
export function Panel({
  genreId, artist, festival, label, playing, playlist, onPlay, onSelect, onSelectArtist, onOpenFestival, onOpenArtist, onOpenLabel, onCompare, onClose,
}: Props) {
  const chips = (ids: string[], keepArtist = false) =>
    ids.length ? (
      <div className="hud__chips">
        {ids.map((id) => (
          <button key={id} className="hud__chip" onClick={() => { onSelect(id); if (keepArtist) onSelectArtist(artist); }}>
            {genreById[id].name}
          </button>
        ))}
      </div>
    ) : (
      <span className="hud__muted">—</span>
    );

  const trackList = (tracks: Track[]) => {
    const queue = tracks.filter((t) => t.youtube);
    return (
      <ul className="hud__list">
        {tracks.map((t) => {
          const now = !!t.youtube && playing?.youtube === t.youtube;
          const body = (
            <>
              <span className="hud__track"><b>{t.title}</b> · {t.artist}</span>
              <span>{t.year ?? ''} {t.youtube ? (now ? '♪' : '▶') : '↗'}</span>
            </>
          );
          return (
            <li key={`${t.artist}|${t.title}`} className="hud__row">
              {t.youtube ? (
                <button className={now ? 'is-playing' : undefined} onClick={() => onPlay(t, queue)}
                  aria-label={`Play ${t.title} by ${t.artist}`}>{body}</button>
              ) : (
                <a href={youtube(`${t.artist} ${t.title}`)} target="_blank" rel="noopener noreferrer">{body}</a>
              )}
              {t.youtube && <HeartButton track={t} playlist={playlist} />}
            </li>
          );
        })}
      </ul>
    );
  };

  if (festival) {
    const f = festivalById[festival];
    const seen = artistsAtFestival(f.id);
    return (
      <HudShell className="hud">
        <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
        <div className="hud__tag">// STATION · FESTIVAL</div>
        <h2>{f.name}</h2>
        <div className="hud__stats">
          <span>COUNTRY <b>{f.country}</b></span>
          {f.since && <span>SINCE <b>{f.since}</b></span>}
        </div>
        <p>{f.description}</p>
        <div className="hud__label">Docked systems</div>
        {chips(f.genres)}
        {seen.length > 0 && (
          <>
            <div className="hud__label">Artists with sets here</div>
            <div className="hud__chips">
              {seen.map((a) => (
                <button key={a} className="hud__chip" onClick={() => onOpenArtist(a)}>{a}</button>
              ))}
            </div>
          </>
        )}
        <div className="hud__footer">
          <a className="hud__ext" href={youtube(`${f.name} full set`)} target="_blank" rel="noopener noreferrer">Sets on YouTube ↗</a>
          <FixLink about="FESTIVAL" name={f.name} />
          <ShareButton />
        </div>
      </HudShell>
    );
  }

  if (label) {
    const gs = genresOfLabel(label);
    const lp = labels[label];
    return (
      <HudShell className="hud">
        <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
        <div className="hud__tag">// CONSTELLATION · LABEL</div>
        <h2>{label}</h2>
        {(lp?.country || lp?.since) && (
          <div className="hud__stats">
            {lp.country && <span>COUNTRY <b>{lp.country}</b></span>}
            {lp.since && <span>SINCE <b>{lp.since}</b></span>}
          </div>
        )}
        <p>The systems this label is known for, linked in the order they appeared. Labels often define a sound: follow the line to hear what connects them.</p>
        <div className="hud__label">Systems in this constellation</div>
        {chips([...gs].sort((x, y) => x.year - y.year).map((x) => x.id))}
        {lp?.artists.length ? (
          <>
            <div className="hud__label">Artists on this label</div>
            <div className="hud__chips">
              {lp.artists.map((a) => (
                <button key={a} className="hud__chip" onClick={() => onOpenArtist(a)}>{a}</button>
              ))}
            </div>
          </>
        ) : null}
        <div className="hud__footer">
          <a className="hud__ext" href={youtube(label)} target="_blank" rel="noopener noreferrer">Search on YouTube ↗</a>
          <FixLink about="LABEL" name={label} />
          <ShareButton />
        </div>
      </HudShell>
    );
  }

  if (!genreId) {
    return (
      <HudShell className="hud hud--idle" foldOnPhone>
        <div className="hud__tag">// NAVIGATION</div>
        <p>Drag to move, scroll or pinch to zoom. Click anything on the map to open it here.</p>
        <dl className="hud__specs hud__legend">
          <dt>● STAR</dt>
          <dd>A genre: its sound, history and key tracks. Zoom in close to see its artists orbiting.</dd>
          <dt>▲3</dt>
          <dd>Events this week (or month) that play the genre. Switch in the ship console, bottom left.</dd>
          <dt>▲ SHIP</dt>
          <dd>An upcoming party, parked between the stars of the genres its line-up plays. Hover or tap to see its course.</dd>
          <dt>▲▲ ×4</dt>
          <dd>A fleet: several parties that sound alike.</dd>
          <dt>⚓ HARBOUR</dt>
          <dd>Parties whose genre isn't known yet.</dd>
          <dt>◇ ⬡</dt>
          <dd>Festival stations and record labels; turn them on or off in the legend.</dd>
          <dt>▶ ♡</dt>
          <dd>Play a track while you explore; save it to your playlist.</dd>
        </dl>
      </HudShell>
    );
  }

  const g = genreById[genreId];
  const fam = data.families[g.family];

  if (artist) {
    const p = artists[artist];
    const tracks = tracksOfArtist(artist);
    const played = (appearances[artist] ?? []).filter((x) => festivalById[x.festival]);
    const artistLabels = labelsOfArtist(artist);
    const src = sources[artist];
    return (
      <HudShell className="hud" style={{ ['--fam' as string]: fam.color }}>
        <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
        <button className="hud__back" onClick={() => onSelectArtist(null)}>← {g.name}</button>
        <div className="hud__tag">// SATELLITE · ARTIST</div>
        <h2>{artist}</h2>
        {(p?.country || p?.since) && (
          <div className="hud__stats">
            {p.country && <span>ORIGIN <b>{p.country}</b></span>}
            {p.since && <span>ACTIVE SINCE <b>{p.since}</b></span>}
          </div>
        )}

        <NextGigs name={artist} />

        {tracks.length > 0 && (<><div className="hud__label">Tracks on the map</div>{trackList(tracks)}</>)}

        <div className="hud__label">Albums</div>
        {p?.albums.length ? (
          <ul className="hud__albums">
            {p.albums.slice(0, 6).map((a) => (
              <li key={a.title}><span>{a.title}</span><span>{a.year}</span></li>
            ))}
          </ul>
        ) : (
          <span className="hud__muted">No verified album data yet.</span>
        )}

        {played.length > 0 && (
          <>
            <div className="hud__label">Played at</div>
            <ul className="hud__list">
              {played.map((x) => (
                <li key={x.festival} className="hud__row">
                  {x.video ? (
                    <button onClick={() => onPlay({ artist, title: `Live at ${festivalById[x.festival].name}`, youtube: x.video })}
                      aria-label={`Play ${artist} set at ${festivalById[x.festival].name}`}>
                      <span className="hud__track"><b>{festivalById[x.festival].name}</b> · set</span><span>▶</span>
                    </button>
                  ) : (
                    <button onClick={() => onOpenFestival(x.festival)} title={x.title}>
                      <span className="hud__track"><b>{festivalById[x.festival].name}</b> · line-up</span><span>◇</span>
                    </button>
                  )}
                  <button className="heart" onClick={() => onOpenFestival(x.festival)} title="Open this station" aria-label={`Open ${festivalById[x.festival].name}`}>◇</button>
                </li>
              ))}
            </ul>
          </>
        )}

        {artistLabels.length > 0 && (
          <>
            <div className="hud__label">Released on</div>
            <div className="hud__chips">
              {artistLabels.map((l) => (
                <button key={l} className="hud__chip" onClick={() => onOpenLabel(l)}>{l}</button>
              ))}
            </div>
          </>
        )}

        <div className="hud__label">Orbits these systems</div>
        {chips(genresOfArtist(artist).map((x) => x.id), true)}

        {src && (
          <>
            <div className="hud__label">Check the facts</div>
            <ul className="facts">
              {genresOfArtist(artist).map((x) => {
                const st = src.check[x.id] ?? 'nodata';
                return (
                  <li key={x.id} className={'facts__' + st}>
                    <span>{x.name}</span>
                    <small>{CHECK_TEXT[st]}</small>
                  </li>
                );
              })}
            </ul>
            {src.tags.length > 0 && <p className="facts__tags">Public tags: {src.tags.join(' · ')}</p>}
            {src.suggest.length > 0 && (
              <p className="facts__tags">Tags also point to: {src.suggest.map((id) => (
                <button key={id} className="hud__link" onClick={() => onSelect(id)}>{genreById[id].name}</button>
              ))}</p>
            )}
            <div className="facts__links">
              {src.musicbrainz && <a href={`https://musicbrainz.org/artist/${src.musicbrainz}`} target="_blank" rel="noopener noreferrer">MusicBrainz ↗</a>}
              {src.discogs && <a href={`https://www.discogs.com/artist/${src.discogs}`} target="_blank" rel="noopener noreferrer">Discogs ↗</a>}
              {src.lastfm && <a href={src.lastfm} target="_blank" rel="noopener noreferrer">Last.fm ↗</a>}
            </div>
          </>
        )}

        <div className="hud__footer">
          <a className="hud__ext" href={youtube(artist)} target="_blank" rel="noopener noreferrer">Search on YouTube ↗</a>
          <FixLink about="ARTIST" name={artist} />
          <ShareButton />
        </div>
      </HudShell>
    );
  }

  const stations = festivals.filter((f) => f.genres.includes(g.id));
  const from = data.links.filter(([, b]) => b === g.id).map(([a]) => a);
  const to = data.links.filter(([a]) => a === g.id).map(([, b]) => b);

  return (
    <HudShell className="hud" style={{ ['--fam' as string]: fam.color }}>
      <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
      <div className="hud__tag">// SYSTEM · {fam.name.toUpperCase()}</div>
      <h2>{g.name}</h2>
      <button className="hud__compare" onClick={() => onCompare(g.id)}>⇄ Compare</button>
      <div className="hud__stats">
        <span>DISCOVERED <b>≈{g.year}</b></span>
        <span>TEMPO <b>{g.bpm[0]}–{g.bpm[1]} BPM</b></span>
      </div>
      <p>{g.description}</p>

      <div className="hud__label">How it sounds</div>
      <dl className="hud__specs">
        <dt>BASS</dt><dd>{g.production.bass}</dd>
        <dt>KICK</dt><dd>{g.production.kick}</dd>
        <dt>ATMOSPHERE</dt><dd>{g.production.atmosphere}</dd>
      </dl>

      <ProducerCorner genre={g} />

      {g.tracks.length > 0 && (<><div className="hud__label">Key tracks</div>{trackList(g.tracks)}</>)}

      <div className="hud__label">Artists</div>
      <div className="hud__chips">
        {g.artists.map((a) => (
          <button key={a} className="hud__chip" onClick={() => onSelectArtist(a)}>
            {a}{genresOfArtist(a).length > 1 && <sup> {genresOfArtist(a).length}</sup>}
          </button>
        ))}
      </div>

      {(g.labels.length > 0 || g.countries.length > 0 || stations.length > 0) && (
        <dl className="hud__specs hud__specs--meta">
          {g.labels.length > 0 && (<><dt>LABELS</dt><dd>{g.labels.map((l) => (
            <button key={l} className="hud__link" onClick={() => onOpenLabel(l)} title="Show this label's constellation">{l}</button>
          ))}</dd></>)}
          {g.countries.length > 0 && (<><dt>SCENE</dt><dd>{g.countries.join(', ')}</dd></>)}
          {stations.length > 0 && (<><dt>FESTIVALS</dt><dd>{stations.map((f) => (
            <button key={f.id} className="hud__link" onClick={() => onOpenFestival(f.id)}>{f.name}</button>
          ))}</dd></>)}
        </dl>
      )}

      <div className="hud__label">Evolved from</div>
      {chips(from)}
      <div className="hud__label">Influenced</div>
      {chips(to)}
      <div className="hud__footer"><FixLink about="GENRE" name={g.name} /><ShareButton /></div>
    </HudShell>
  );
}
