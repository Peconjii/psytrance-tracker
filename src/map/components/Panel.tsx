import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ProducerCorner } from './ProducerCorner';
import { NextGigs } from './NextGigs';
import { LabelCrew } from './LabelCrew';
import { FixLink, SuggestArtistLink, SuggestGenreLink, SuggestTrackLink } from './FixLink';
import { HeartButton } from './Playlist';
import FollowButton from '../../components/FollowButton.jsx';
import type { PlaylistApi } from '../hooks/usePlaylist';
import { artistSlug } from '../data/events';
import {
  appearances, artists, artistsAtFestival, data, labels, labelsOfArtist, sources, festivalById, festivals, genreById, genresOfArtist, genresOfLabel, mainGenreOf, orbitingArtists, tracksOfArtist,
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
  /** Upcoming ships of the open genre ("this week" / "this month"); a tap opens them as a fleet */
  ships?: { count: number; when: string; onOpen: () => void } | null;
}

const isPhone = () => window.matchMedia('(max-width: 700px)').matches;

/**
 * HUD container. On phones it is a bottom sheet, like Google Maps: it opens peeking from the bottom (the star and
 * its artists stay in view above it), a swipe up or a tap on the handle opens it all the way, a swipe down brings
 * it back and one more swipe down closes it. The help panel (no onClose) only folds.
 */
export function HudShell({ className, style, children, foldOnPhone = false, onClose }: {
  className: string; style?: CSSProperties; children: ReactNode; foldOnPhone?: boolean; onClose?: () => void;
}) {
  // The help panel starts folded on phones, where open it would cover most of the map
  const [folded, setFolded] = useState(() => foldOnPhone && isPhone());
  const [full, setFull] = useState(false);
  const sheet = Boolean(onClose);
  const drag = useRef<{ y: number; at: number } | null>(null);
  const ref = useRef<HTMLElement>(null);

  // While a sheet is open the ship console steps aside on phones (map.css)
  useEffect(() => {
    if (!sheet) return;
    document.documentElement.classList.add('has-sheet');
    return () => document.documentElement.classList.remove('has-sheet');
  }, [sheet]);

  const down = (e: ReactPointerEvent) => {
    // Keep getting the pointer while the finger slides off the handle
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    drag.current = { y: e.clientY, at: Date.now() };
  };
  const up = (e: ReactPointerEvent) => {
    const start = drag.current;
    drag.current = null;
    if (!start) return;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) < 12) { setFull((f) => !f); return; }   // a tap
    if (dy < 0) setFull(true);
    else if (full) setFull(false);
    else onClose?.();
  };

  const classes = [className, folded && 'is-folded', sheet && (full ? 'sheet-full' : 'sheet-peek')].filter(Boolean).join(' ');
  return (
    <aside ref={ref} className={classes} style={style}>
      {sheet ? (
        <button type="button" className="hud__grab" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}
          aria-expanded={full} aria-label={full ? 'Show less' : 'Show more'}>
          <span aria-hidden="true" />
        </button>
      ) : (
        <button className="hud__fold" onClick={() => {
          if (folded) window.dispatchEvent(new Event('player:shrink'));   // a playing track becomes its bubble
          setFolded((f) => !f);
        }} aria-expanded={!folded}>
          {folded ? '▴ Show info' : '▾ Hide'}
        </button>
      )}
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
  genreId, artist, festival, label, playing, playlist, onPlay, onSelect, onSelectArtist, onOpenFestival, onOpenArtist, onOpenLabel, onCompare, onClose, ships,
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

  // genre: set for a genre's key tracks, which get their own "✎" (the report then says which track and where)
  const trackList = (tracks: Track[], genre?: string) => {
    const queue = tracks.filter((t) => t.youtube);
    return (
      <ul className="hud__list">
        {tracks.map((t) => {
          const now = !!t.youtube && playing?.youtube === t.youtube;
          const body = (
            <>
              <span className="hud__track">{t.verified && <i className="hud__verified" title="Checked">✓ </i>}<b>{t.title}</b> · {t.artist}</span>
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
              {genre && <FixLink compact about="GENRE" name={`${genre}: ${t.title} by ${t.artist}`} />}
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
      <HudShell className="hud" onClose={onClose}>
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
          <Link className="hud__ext" to={`/festivals/${encodeURIComponent(f.id)}`}>Festival page →</Link>
        </div>
      </HudShell>
    );
  }

  if (label) {
    const gs = genresOfLabel(label);
    const lp = labels[label];
    return (
      <HudShell className="hud" onClose={onClose}>
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
        <LabelCrew label={label} mapCrew={lp?.artists ?? []} onOpenArtist={onOpenArtist} />
        <div className="hud__footer">
          <a className="hud__ext" href={youtube(label)} target="_blank" rel="noopener noreferrer">Search on YouTube ↗</a>
          <FixLink about="LABEL" name={label} />
          <ShareButton />
          <FollowButton label={label} name={label} className="hud__share" />
          <Link className="hud__ext" to={`/labels/${encodeURIComponent(label)}`}>Label page →</Link>
        </div>
      </HudShell>
    );
  }

  if (!genreId) {
    return (
      <HudShell key="idle" className="hud hud--idle" foldOnPhone>
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
        <SuggestGenreLink />
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
      <HudShell className="hud" style={{ ['--fam' as string]: fam.color }} onClose={onClose}>
        <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
        <button className="hud__back" onClick={() => onSelectArtist(null)}>← {g.name}</button>
        <div className="hud__tag">// SATELLITE · ARTIST</div>
        <h2>{artist}</h2>
        {/* The artist's own page: profile, booking, every gig and the ones they played before */}
        <Link className="hud__link hud__profile" to={`/artists/${encodeURIComponent(artistSlug(artist))}`} state={{ name: artist }}>
          Full profile →
        </Link>
        {(p?.country || p?.since) && (
          <div className="hud__stats">
            {p.country && <span>ORIGIN <b>{p.country}</b></span>}
            {p.since && <span>ACTIVE SINCE <b>{p.since}</b></span>}
          </div>
        )}

        <NextGigs name={artist} />

        {/* Shown even without tracks: listeners fill the gaps (Admin -> Feedback, then Admin -> Galaxy) */}
        <div className="hud__label">Tracks on the map</div>
        {tracks.length > 0 ? trackList(tracks) : <p className="hud__muted">No track on the map yet.</p>}
        <SuggestTrackLink artist={artist} />

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
    <HudShell className="hud" style={{ ['--fam' as string]: fam.color }} onClose={onClose}>
      <button className="hud__close" onClick={onClose} aria-label="Close">×</button>
      <div className="hud__tag">// SYSTEM · {fam.name.toUpperCase()}</div>
      <h2>{g.name}{g.verified && <span className="hud__verified hud__verified--badge" title="Someone checked this text">✓ verified</span>}</h2>
      <button className="hud__compare" onClick={() => onCompare(g.id)}>⇄ Compare</button>
      <div className="hud__stats">
        <span>DISCOVERED <b>≈{g.year}</b></span>
        <span>TEMPO <b>{g.bpm[0]}–{g.bpm[1]} BPM</b></span>
      </div>
      <p>{g.description}</p>

      {/* A genre added from the panel may not have these written yet */}
      {(g.production.bass || g.production.kick || g.production.atmosphere) && (
        <>
          <div className="hud__label">How it sounds</div>
          <dl className="hud__specs">
            {g.production.bass && <><dt>BASS</dt><dd>{g.production.bass}</dd></>}
            {g.production.kick && <><dt>KICK</dt><dd>{g.production.kick}</dd></>}
            {g.production.atmosphere && <><dt>ATMOSPHERE</dt><dd>{g.production.atmosphere}</dd></>}
          </dl>
        </>
      )}

      <ProducerCorner genre={g} />

      {ships && ships.count > 0 && (
        <button className="hud__ships" onClick={ships.onOpen}>
          ▲ {ships.count} {ships.count === 1 ? 'ship' : 'ships'} {ships.when} play {g.name} →
        </button>
      )}

      {g.tracks.length > 0 && (<><div className="hud__label">Key tracks</div>{trackList(g.tracks, g.name)}</>)}

      {/* All of them here; the orbit on the map shows 12 at most (followed ones first) */}
      <div className="hud__label">Artists · {orbitingArtists(g).length}</div>
      <div className="hud__chips">
        {orbitingArtists(g).map((a) => (
          <button key={a} className="hud__chip" onClick={() => onSelectArtist(a)}>
            {a}{genresOfArtist(a).length > 1 && <sup> {genresOfArtist(a).length}</sup>}
          </button>
        ))}
      </div>
      {/* Artists who play this genre too but orbit their main genre's star */}
      {g.artists.length > orbitingArtists(g).length && (
        <p className="hud__also">
          Also plays it:{' '}
          {g.artists.filter((a) => !orbitingArtists(g).includes(a)).map((a, i) => (
            <span key={a}>{i > 0 && ', '}<button className="hud__link" onClick={() => onSelectArtist(a)}
              title={`Orbits ${genreById[mainGenreOf(a) ?? '']?.name ?? 'another star'}`}>{a}</button></span>
          ))}
        </p>
      )}
      <SuggestArtistLink genre={g.name} />

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
