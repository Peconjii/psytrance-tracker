import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'

const GITHUB_PROFILE = 'https://github.com/Peconjii'
const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/petar-vlku-a6445b294/'
const INSTAGRAM = 'https://www.instagram.com/mapofpsy/'

// Why the map exists and the story behind it
function About() {
    usePageMeta({
        title: 'About',
        description: 'Why Map of Psy exists: one place for the whole psytrance culture, its history, its sound and its parties.',
        path: '/about',
    })
    return (
        <div className="page about">
            <header className="page-head">
                <div className="page-head__tag">// About · Map of Psy</div>
                <h1 className="page-title">Why this map exists</h1>
            </header>

            <div className="about__manifest">
                <p>Psytrance is more than music. Anyone who has stood on a dancefloor at sunrise knows the feeling: hundreds
                    of strangers moving as one, connected in a way words can&apos;t quite reach — as if together we&apos;re part
                    of something bigger than any of us.</p>
                <p>It&apos;s a culture of open minds. At parties and festivals you meet people who will talk about anything,
                    who look at the world from angles you never considered. For many of us, this music opened a new way of
                    seeing.</p>
            </div>

            <section className="about__part">
                <h2 className="about__label">// The story</h2>
                <p>It started in a small town in eastern Serbia. In high school, as my mind began to open, so did my ears — I
                    went looking for sounds beyond what everyone around me was playing. At 16 I discovered psytrance — a sound
                    that felt like it was speaking directly to me. Every track pulled me deeper, until the music became part of
                    who I am.</p>
                <p>At 18 came the first party. The kindness, the ease, the feeling that everyone there was the same — one — in
                    a way I still can&apos;t explain. And with every party and festival since, that feeling has only grown
                    stronger.</p>
                <p>I always wanted to give something back to this community, but music production never held my attention.
                    Then I started studying programming, and the idea came. I wanted to understand where this music was born,
                    how it grew, and what really separates one style from another. Then I wanted to know where it&apos;s played.
                    When I found Goabase, it clicked: the history and the sound of psytrance could live right next to the
                    parties and festivals happening now.</p>
                <p>So I built it — a little bit, every single day — for everyone who feels what happens between people on a
                    dancefloor the way I do.</p>
            </section>

            <section className="about__part">
                <h2 className="about__label">// For everyone on the floor</h2>
                <p>Whether you discovered psy last week or have been dancing for twenty years, this map is for you. Explore the
                    galaxy of genres, find your next party, and help it grow — every event and correction you add makes it
                    truer.</p>
                <div className="about__actions">
                    <Link to="/events/new" className="btn">+ Add an event</Link>
                    <Link to="/" className="btn btn--ghost">✦ Explore the galaxy</Link>
                    <Link to="/feedback?kind=CORRECTION&from=/about" className="btn btn--ghost">✎ Fix something</Link>
                </div>
            </section>

            <p className="about__links mono text-xs">
                <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram ↗</a> ·{' '}
                <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">GitHub ↗</a> ·{' '}
                <a href={LINKEDIN_PROFILE} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
            </p>
        </div>
    )
}

export default About
