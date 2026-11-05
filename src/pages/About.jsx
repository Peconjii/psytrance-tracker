import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'

const GITHUB_PROFILE = 'https://github.com/Peconjii'
const LINKEDIN_PROFILE = 'https://www.linkedin.com/in/petar-vlku-a6445b294/'

// Crypto addresses for donations: { coin, network, address }. The support box shows them once there are any.
const CRYPTO = [
    { coin: 'BTC', network: 'Bitcoin', address: 'bc1qcyskg99t7pu5up8rpr2rt4slhtyu30ulddynap' },
    { coin: 'ETH', network: 'Ethereum', address: '0x86CF8be12cDeeb6aDd68f347BeBa232aE17c39ea' },
    { coin: 'USDT / TRX', network: 'Tron (TRC20)', address: 'THfBskd3GAWLML96VgrBnBnekZdCjmVnpu' },
    { coin: 'XRP', network: 'XRP Ledger', address: 'raZWviaGqHVosG7Gjas7PQFrrhWrfEGAPs' },
]

// Why the map exists, the story behind it and how to support it. The footer's "♡ Support" opens #support.
function About() {
    usePageMeta({
        title: 'About',
        description: 'Why Map of Psy exists: one place for the whole psytrance culture, its history, its sound and its parties.',
        path: '/about',
    })
    // "♡ Support" in the footer links to /about#support: the router doesn't scroll to it by itself
    const { hash } = useLocation()
    useEffect(() => {
        if (hash === '#support') document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' })
    }, [hash])
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

            <section id="support" className="about__support">
                <h2 className="about__label">// Support</h2>
                <p>Map of Psy is free and always will be — it&apos;s built for the community, not for money. The best way
                    to support it is to add an event, fix what&apos;s wrong, or share the map with someone who&apos;d feel it
                    too. And if you&apos;d still like to chip in for the servers and the domain, every bit is welcome.</p>
                {CRYPTO.length > 0 && (
                    <details className="about__crypto">
                        <summary>Crypto ({CRYPTO.map(c => c.coin).join(' · ')})</summary>
                        <ul>{CRYPTO.map(c => <Address key={c.address} {...c} />)}</ul>
                    </details>
                )}
            </section>

            <p className="about__links mono text-xs">
                <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer">GitHub ↗</a> ·{' '}
                <a href={LINKEDIN_PROFILE} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
            </p>
        </div>
    )
}

function Address({ coin, network, address }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard?.writeText(address).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }).catch(() => {})
    }
    return (
        <li>
            <span className="about__coin">{coin}{network && <small> · {network}</small>}</span>
            <code>{address}</code>
            <button type="button" className="btn btn--ghost" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </li>
    )
}

export default About
