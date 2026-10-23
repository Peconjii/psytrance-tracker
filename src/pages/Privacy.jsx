import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'

// What the site keeps about people, why, who helps run it, and how to see or delete it. Plain words, no legalese.
function Privacy() {
    usePageMeta({
        title: 'Privacy',
        description: 'What Map of Psy keeps about you, why, and how to delete it.',
        path: '/privacy',
    })
    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Privacy</div>
                <h1 className="page-title">What we keep about you</h1>
                <p className="page-head__sub">Map of Psy is a hobby project. It keeps as little as it can and sells nothing.</p>
            </header>

            <div className="grid gap-4">
                <Part title="Without an account">
                    <p>You can use the map, the events and every page without an account. The site sets no cookies and
                        shows no ads. Your login, when you have one, is kept in your browser&apos;s storage, not in a cookie.</p>
                    <p>If visit counting is on, it is done with <a className="link" href="https://umami.is" target="_blank" rel="noopener noreferrer">Umami</a>:
                        without cookies, without following you around, and not at all when your browser asks not to be tracked.
                        It only counts which pages are opened.</p>
                    <p>&ldquo;Near me&rdquo; on the events page asks your browser where you are, rounds it to about a kilometre
                        and uses it for that one list. It is not stored.</p>
                </Part>

                <Part title="With an account">
                    <ul>
                        <li>Your username, your email and your password (stored only as a one-way hash, nobody can read it).</li>
                        <li>What you do on the site: the artists and labels you follow, events you save or are going to, your
                            reviews, the events you add, the pages you own and the requests you send.</li>
                        <li>The date you made the account and whether you confirmed your email.</li>
                    </ul>
                    <p>Your email is used for: confirming it, resetting a forgotten password, reminders before events you saved,
                        new gigs of artists you follow, the Monday email, and an answer when an admin decides about something you
                        sent. You can turn the reminders and the Monday email off on your <Link className="link" to="/profile">profile</Link>.
                        We never send your email to anyone else.</p>
                </Part>

                <Part title="Feedback">
                    <p>A message through the <Link className="link" to="/feedback">feedback form</Link> keeps what you wrote, and
                        your email if you give one, so an admin can answer. It stays when you delete your account, without it.</p>
                </Part>

                <Part title="Who helps run the site">
                    <ul>
                        <li><strong>Vercel</strong> serves the website, <strong>Render</strong> runs the server and
                            <strong> Neon</strong> keeps the database.</li>
                        <li>An email service sends the emails.</li>
                        <li>Events come from <a className="link" href="https://www.goabase.net" target="_blank" rel="noopener noreferrer">Goabase</a>,
                            the weather from <a className="link" href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a>:
                            they don&apos;t get anything about you.</li>
                        <li>Videos play from YouTube in its no-cookie mode: YouTube only sets cookies once you play one.</li>
                    </ul>
                </Part>

                <Part title="Seeing and deleting your data">
                    <p>Everything the site keeps about you is on your <Link className="link" to="/profile">profile</Link>.
                        At its bottom, &ldquo;Delete my account&rdquo; deletes the account and everything that is yours, for good,
                        right away. For anything else, write to us through the <Link className="link" to="/feedback">feedback form</Link>.</p>
                </Part>
            </div>
        </div>
    )
}

function Part({ title, children }) {
    return (
        <section className="panel">
            <h2 className="panel__label">{title}</h2>
            <div className="soft text-sm grid gap-2 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1">{children}</div>
        </section>
    )
}

export default Privacy
