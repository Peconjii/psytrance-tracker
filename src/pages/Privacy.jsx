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
                <Part title="Who is responsible">
                    <p>Map of Psy is run by <strong>Petar Vlku</strong>, a private person in Serbia. He decides what the site
                        keeps and is the one to write to about your data: <a className="link" href="mailto:hello@mapofpsy.com">hello@mapofpsy.com</a>.</p>
                </Part>

                <Part title="Without an account">
                    <p>You can use the map, the events and every page without an account. The site sets no cookies and
                        shows no ads. Your login, when you have one, is kept in your browser&apos;s storage, not in a cookie.</p>
                    <p>Visits are counted with <a className="link" href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Web Analytics</a>:
                        without cookies and without following you from site to site. It only counts which pages are opened,
                        from which country and from which site you came.</p>
                    <p>&ldquo;Near me&rdquo; on the events page asks your browser where you are, rounds it to about a kilometre
                        and uses it for that one list. It is not stored.</p>
                </Part>

                <Part title="With an account">
                    <ul>
                        <li>Your username, your email and your password (stored only as a one-way hash, nobody can read it).</li>
                        <li>What you do on the site: the artists and labels you follow, events you save or are going to, your
                            reviews, the events you add, the pages you own and the requests you send.</li>
                        <li>The date you made the account and whether you confirmed your email.</li>
                        <li>With &ldquo;Continue with Google&rdquo;: Google tells us your email (confirmed by Google), your
                            name and an id for your Google account. We keep the email and that id, and use the name only to
                            suggest a username. We get nothing else from Google, and Google doesn&apos;t see what you do here.</li>
                    </ul>
                    <p>Your email is used for: confirming it, resetting a forgotten password, reminders before events you saved,
                        new gigs of artists you follow, the Monday email, and an answer when an admin decides about something you
                        sent. You can turn the reminders and the Monday email off on your <Link className="link" to="/profile">profile</Link>.
                        We never send your email to anyone else.</p>
                </Part>

                <Part title="Why we may use it">
                    <ul>
                        <li>Your account and what you do with it: because you asked for it, the site can&apos;t give you an
                            account, follows or reminders without it.</li>
                        <li>Reminders, new gigs and the Monday email: because you chose them; you can turn them off any time on
                            your profile.</li>
                        <li>Counting visits and keeping the site safe (login limits, stopping spam): because the site has a
                            fair interest in working and staying safe, done without cookies and without following you.</li>
                    </ul>
                </Part>

                <Part title="How long we keep it">
                    <ul>
                        <li>Your account and everything that is yours: until you delete the account, then right away.</li>
                        <li>Feedback messages: as long as they help improve the site; write to us and we delete yours.</li>
                    </ul>
                </Part>

                <Part title="Feedback">
                    <p>A message through the <Link className="link" to="/feedback">feedback form</Link> keeps what you wrote, and
                        your email if you give one, so an admin can answer. It stays when you delete your account, without it.</p>
                </Part>

                <Part title="Who helps run the site">
                    <ul>
                        <li><strong>Vercel</strong> serves the website, <strong>Render</strong> runs the server and
                            <strong> Neon</strong> keeps the database.</li>
                        <li><strong>Brevo</strong> sends the emails; <strong>Cloudflare</strong> passes on mail written to hello@mapofpsy.com.</li>
                        <li><strong>Google</strong>, only if you use &ldquo;Continue with Google&rdquo;: its button loads
                            on the login and register pages.</li>
                        <li>Events come from <a className="link" href="https://www.goabase.net" target="_blank" rel="noopener noreferrer">Goabase</a>,
                            the weather from <a className="link" href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a>:
                            they don&apos;t get anything about you.</li>
                        <li><strong>Vercel Web Analytics</strong> counts visits, without cookies (see above).</li>
                        <li>Videos play from YouTube in its no-cookie mode: YouTube only sets cookies once you play one.</li>
                    </ul>
                    <p>Some of these companies are in the United States, so your data may be kept or handled there. They
                        promise to protect it to EU standards (the EU&apos;s standard contract clauses or the EU-US Data
                        Privacy Framework).</p>
                </Part>

                <Part title="Seeing and deleting your data">
                    <p>Everything the site keeps about you is on your <Link className="link" to="/profile">profile</Link>.
                        At its bottom, &ldquo;Delete my account&rdquo; deletes the account and everything that is yours, for good,
                        right away. For anything else, write to us through the <Link className="link" to="/feedback">feedback form</Link> or
                        to <a className="link" href="mailto:hello@mapofpsy.com">hello@mapofpsy.com</a>.</p>
                    <p>You can always ask to see what we keep about you, to correct it, to get a copy of it, or to stop us using
                        it; we answer within a month. If you think we handle your data wrongly, you can complain to the data
                        protection authority where you live (in Serbia: the Commissioner for Information of Public Importance
                        and Personal Data Protection).</p>
                </Part>

                <Part title="Age">
                    <p>You need to be at least 16 to make an account.</p>
                </Part>

                <p className="muted text-xs m-0">Last updated: 8 November 2026. Also see the <Link className="link" to="/terms">terms of use</Link>.</p>
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
