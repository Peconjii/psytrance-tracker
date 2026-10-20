import { useState } from 'react';
import { famousTracks, genreById, playableGenres as playable, randomTrack, type Genre, type Track } from '../data/types';

const ROUNDS = 10;
const PLAYED_KEY = 'map-of-psy.quiz.played';

/** First game in this browser uses well-known classics; later games draw from the whole map */
const hasPlayed = () => { try { return localStorage.getItem(PLAYED_KEY) === '1'; } catch { return false; } };
const markPlayed = () => { try { localStorage.setItem(PLAYED_KEY, '1'); } catch { /* storage blocked */ } };
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

interface Question {
  genre: Genre;
  track: Track;
  options: string[];
}

/** One correct genre plus three wrong ones: one from the same scene when possible, so it isn't too easy */
function makeQuestion(used: Set<string>, famous: boolean): Question {
  // Classics round: unused famous tracks, preferring genres not asked yet so the game covers the map
  const askedGenres = new Set(famousTracks().filter((x) => used.has(x.track.youtube!)).map((x) => x.genre.id));
  const fresh = famousTracks().filter((x) => !used.has(x.track.youtube!));
  const pool = fresh.filter((x) => !askedGenres.has(x.genre.id));
  let q = famous && fresh.length ? (pool.length ? pool : fresh)[Math.floor(Math.random() * (pool.length ? pool : fresh).length)] : randomTrack();
  for (let i = 0; !famous && i < 20 && used.has(q.track.youtube!); i++) q = randomTrack();
  const others = playable().filter((g) => g.id !== q.genre.id);
  const near = shuffle(others.filter((g) => g.family === q.genre.family)).slice(0, 1);
  const far = shuffle(others.filter((g) => !near.includes(g))).slice(0, 3 - near.length);
  return { ...q, options: shuffle([q.genre.id, ...near.map((g) => g.id), ...far.map((g) => g.id)]) };
}

interface Props {
  onPlay: (t: Track, hidden: boolean) => void;
  onReveal: (genreId: string) => void;
  onExit: () => void;
}

/** "Guess the genre": a mystery track plays, you pick the system it belongs to */
export function Quiz({ onPlay, onReveal, onExit }: Props) {
  const [used] = useState(() => new Set<string>());
  const [famous, setFamous] = useState(() => !hasPlayed());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [q, setQ] = useState<Question>(() => {
    const first = makeQuestion(used, !hasPlayed());
    used.add(first.track.youtube!);
    return first;
  });
  const [started, setStarted] = useState(false);
  const done = round > ROUNDS;

  const start = () => { setStarted(true); onPlay(q.track, true); };
  const choose = (id: string) => {
    if (answer) return;
    setAnswer(id);
    if (id === q.genre.id) setScore((s) => s + 1);
    onPlay(q.track, false);
    onReveal(q.genre.id);
  };
  const next = () => {
    if (round === ROUNDS) markPlayed();
    const n = makeQuestion(used, famous);
    used.add(n.track.youtube!);
    setQ(n);
    setAnswer(null);
    setRound((r) => r + 1);
    if (round < ROUNDS) onPlay(n.track, true);
  };

  const restart = () => {
    used.clear();
    setFamous(false);
    const n = makeQuestion(used, false);
    used.add(n.track.youtube!);
    setQ(n);
    setAnswer(null);
    setRound(1);
    setScore(0);
    onPlay(n.track, true);
  };

  // Leaving after answering counts as having played, so the next game uses the whole map
  const exit = () => {
    if (answer || round > 1) markPlayed();
    onExit();
  };

  return (
    <section className="tourbar quiz" aria-label="Guess the genre quiz">
      <div className="tourbar__head">
        <span className="tourbar__tag">// QUIZ · GUESS THE GENRE · {done ? 'DONE' : `${round}/${ROUNDS}`} · SCORE {score}</span>
        <button className="tourbar__exit" onClick={exit} aria-label="Exit quiz">×</button>
      </div>

      {done ? (
        <>
          <h3>{score}/{ROUNDS} {score >= 8 ? '· Psy navigator 🛸' : score >= 5 ? '· Solid ears' : '· Keep exploring'}</h3>
          <p>Every wrong answer is a system worth visiting. Play again to get a new set of tracks.</p>
          <div className="tourbar__nav">
            <button onClick={exit}>Close</button>
            <button className="tourbar__next" onClick={restart}>Play again ↻</button>
          </div>
        </>
      ) : !started ? (
        <>
          <h3>Can you tell your twilight from your darkpsy?</h3>
          <p>{famous ? `${ROUNDS} well-known classics from all over the map to start with.` : `${ROUNDS} mystery tracks from all over the map.`} Listen, then pick the system each one belongs to. The player hides the title until you answer.</p>
          <div className="tourbar__nav"><span /><button className="tourbar__next" onClick={start}>Start ▶</button></div>
        </>
      ) : (
        <>
          <h3>{answer ? (answer === q.genre.id ? 'Correct ✓' : `It's ${q.genre.name}`) : 'Which system is this?'}</h3>
          {answer && <p><b>{q.track.title}</b> · {q.track.artist}{q.track.year ? ` (${q.track.year})` : ''}</p>}
          <div className="quiz__options">
            {q.options.map((id) => (
              <button key={id} onClick={() => choose(id)} disabled={!!answer}
                className={answer ? (id === q.genre.id ? 'is-right' : id === answer ? 'is-wrong' : undefined) : undefined}>
                {genreById[id].name}
              </button>
            ))}
          </div>
          {answer && (
            <div className="tourbar__nav">
              <span className="quiz__hint">{genreById[q.genre.id].bpm[0]}–{genreById[q.genre.id].bpm[1]} BPM · {genreById[q.genre.id].production.bass}</span>
              <button className="tourbar__next" onClick={next}>{round === ROUNDS ? 'Results →' : 'Next track →'}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
