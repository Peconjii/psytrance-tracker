import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// One "Share" button for every page people pass around (events, artists, festivals, labels, organizers).
// Phones: the phone's own share sheet, with every app the person has (WhatsApp, Viber, Instagram, Messenger…).
// Computers, and phones without one: a small panel with the usual places and "Copy link".

const enc = encodeURIComponent

function targets(url, title, text) {
    const message = `${text} ${url}`
    return [
        { name: 'WhatsApp', icon: '◔', href: `https://api.whatsapp.com/send?text=${enc(message)}` },
        { name: 'Telegram', icon: '➤', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
        { name: 'Viber', icon: '✆', href: `viber://forward?text=${enc(message)}` },
        { name: 'Facebook', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
        { name: 'X / Twitter', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
        { name: 'Reddit', icon: '◉', href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}` },
        { name: 'Email', icon: '✉', href: `mailto:?subject=${enc(title)}&body=${enc(message)}` },
    ]
}

// A touch phone or tablet with a share sheet; computers get the panel even when the browser has one
const nativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    && window.matchMedia('(pointer: coarse)').matches

/** path: the page to share ("/events/123"); title: its name; text: one line that goes with the link */
export default function ShareButton({ path, title, text, className = 'btn' }) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    // Where the panel opens: drawn on the page's top layer, so a HUD panel's cut corner can't clip it
    const [at, setAt] = useState(null)
    const box = useRef(null)
    const panel = useRef(null)
    const url = `${window.location.origin}${path}`

    // Closes on a click outside or Escape
    useEffect(() => {
        if (!open) return
        const away = (e) => {
            if (!box.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false)
        }
        const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
        const close = () => setOpen(false)
        document.addEventListener('pointerdown', away)
        document.addEventListener('keydown', esc)
        window.addEventListener('scroll', close, { passive: true })
        window.addEventListener('resize', close)
        return () => {
            document.removeEventListener('pointerdown', away)
            document.removeEventListener('keydown', esc)
            window.removeEventListener('scroll', close)
            window.removeEventListener('resize', close)
        }
    }, [open])

    const share = async () => {
        if (nativeShare()) {
            try {
                await navigator.share({ title, text, url })
                return
            } catch (err) {
                // Closed by the person: nothing more; any other failure falls back to the panel
                if (err?.name === 'AbortError') return
            }
        }
        const r = box.current.getBoundingClientRect()
        setAt({ top: r.bottom + 6, left: Math.max(12, Math.min(r.right - 240, window.innerWidth - 252)) })
        setOpen(o => !o)
    }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url)
        } catch {
            // Browsers that don't allow the clipboard API here: the old way, through a selected text field
            const field = Object.assign(document.createElement('textarea'), { value: url })
            field.setAttribute('readonly', '')
            field.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
            document.body.appendChild(field)
            field.select()
            document.execCommand('copy')
            field.remove()
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
    }

    return (
        <div className="share" ref={box}>
            <button type="button" className={className} onClick={share} aria-haspopup="dialog" aria-expanded={open}>↗ Share</button>
            {open && at && createPortal(
                <div className="share__panel" role="dialog" aria-label={`Share ${title}`} ref={panel} style={{ top: at.top, left: at.left }}>
                    <div className="share__head">
                        <span className="panel__label m-0">Share</span>
                        <button type="button" className="share__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
                    </div>
                    <ul className="share__list">
                        {targets(url, title, text).map(t => (
                            <li key={t.name}>
                                <a href={t.href} target={t.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                                    onClick={() => setOpen(false)}>
                                    <span className="share__icon" aria-hidden="true">{t.icon}</span>{t.name}
                                </a>
                            </li>
                        ))}
                        <li>
                            <button type="button" onClick={copy}>
                                <span className="share__icon" aria-hidden="true">⧉</span>{copied ? 'Link copied ✓' : 'Copy link'}
                            </button>
                        </li>
                    </ul>
                </div>,
                document.body,
            )}
        </div>
    )
}
