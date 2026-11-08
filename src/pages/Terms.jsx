import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta.js'

// The few rules of the site, in plain words like the privacy page
function Terms() {
    usePageMeta({
        title: 'Terms of use',
        description: 'The few rules of Map of Psy: what you can post, what admins can do, and what the site promises.',
        path: '/terms',
    })
    return (
        <div className="page page--narrow">
            <header className="page-head">
                <div className="page-head__tag">// Terms</div>
                <h1 className="page-title">Terms of use</h1>
                <p className="page-head__sub">Map of Psy is a free hobby project for the psytrance scene, run by Petar Vlku.
                    Using it means you agree to these few rules.</p>
            </header>

            <div className="grid gap-4">
                <Part title="Your account">
                    <ul>
                        <li>You need to be at least 16 to make an account.</li>
                        <li>Keep your password to yourself; what is done with your account counts as done by you.</li>
                        <li>You can delete your account any time on your <Link className="link" to="/profile">profile</Link>.</li>
                    </ul>
                </Part>

                <Part title="What you post">
                    <ul>
                        <li>Only post what is true and what you have the right to share: your own events, your own page, links
                            to sets and tracks that are public.</li>
                        <li>Claim a page only if it is really yours (you are the artist, or you run the label, festival or crew).</li>
                        <li>No spam, no ads that have nothing to do with the scene, nothing hateful or illegal.</li>
                        <li>What you add stays yours. By posting it you let Map of Psy show it on the site and share links to it.</li>
                    </ul>
                </Part>

                <Part title="What admins can do">
                    <p>Admins check claims, new pages and suggested fixes before they go live. They can change or take down
                        anything that breaks these rules or isn&apos;t accurate, and stop people who misuse the site.
                        Every admin change is kept in the history.</p>
                </Part>

                <Part title="Events and data from others">
                    <p>Many events come from <a className="link" href="https://www.goabase.net" target="_blank" rel="noopener noreferrer">Goabase</a> and
                        others are added by organizers. We do our best to keep them right, but dates, line-ups and tickets can
                        change: check with the organizer before you travel. Map of Psy doesn&apos;t sell tickets or run events
                        and isn&apos;t responsible for them.</p>
                    <p>Music plays from YouTube and other services; it belongs to its artists.</p>
                </Part>

                <Part title="The site itself">
                    <p>The site is free and given as it is: it can be down now and then, and features can change. If these
                        terms change, the date below changes too.</p>
                    <p>Questions or something wrong? Write to <a className="link" href="mailto:hello@mapofpsy.com">hello@mapofpsy.com</a> or
                        use the <Link className="link" to="/feedback">feedback form</Link>. How we handle your data is on
                        the <Link className="link" to="/privacy">privacy page</Link>.</p>
                </Part>

                <p className="muted text-xs m-0">Last updated: 8 November 2026.</p>
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

export default Terms
