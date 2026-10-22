import { SITE_URL } from '../hooks/usePageMeta.js'

// "I play at X": a 1080 × 1920 picture for an Instagram (or any) story, in the site's look, drawn in the browser
const W = 1080
const H = 1920
const BG = '#05040d'
const FG = '#e9e6ff'
const MUTED = '#8f88c4'
const ACCENT = '#3ee6c4'
const GRADIENT = ['#ff9d2e', '#c86bff', '#7aa2ff']
const DISPLAY = "'Unbounded', system-ui, sans-serif"
const MONO = "'JetBrains Mono', ui-monospace, monospace"
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Breaks a text into lines that fit the width, at most `max` lines (the last one cut with …)
function lines(ctx, text, width, max) {
    const out = []
    let line = ''
    for (const word of text.split(/\s+/)) {
        const next = line ? line + ' ' + word : word
        if (ctx.measureText(next).width <= width || !line) {
            line = next
        } else {
            out.push(line)
            line = word
        }
    }
    if (line) out.push(line)
    if (out.length > max) {
        out.length = max
        let last = out[max - 1]
        while (ctx.measureText(last + '…').width > width && last.length > 1) last = last.slice(0, -1)
        out[max - 1] = last + '…'
    }
    return out
}

// The biggest font size (from `start` down) at which the text fits in `maxLines` lines
function fit(ctx, text, family, weight, start, width, maxLines) {
    for (let size = start; size > 40; size -= 4) {
        ctx.font = `${weight} ${size}px ${family}`
        if (lines(ctx, text, width, 99).length <= maxLines) return size
    }
    return 40
}

/** Draws the story and gives back a PNG blob. event: { id, nameParty, dateStart, nameTown, nameCountry } */
export async function storyImage(artistName, event) {
    // The site's fonts, so the canvas draws with them and not a fallback
    await Promise.all([`700 120px ${DISPLAY}`, `400 40px ${MONO}`].map(f => document.fonts.load(f).catch(() => {})))
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // Space: the background, a glow and a few stars (always the same ones, so every story looks alike)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)
    const glow = ctx.createRadialGradient(W * 0.7, H * 0.35, 0, W * 0.7, H * 0.35, W)
    glow.addColorStop(0, 'rgba(200, 107, 255, 0.28)')
    glow.addColorStop(1, 'rgba(5, 4, 13, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let i = 0; i < 140; i++) {
        ctx.fillStyle = `rgba(233, 230, 255, ${0.2 + random() * 0.6})`
        ctx.beginPath()
        ctx.arc(random() * W, random() * H, random() * 2.2 + 0.4, 0, Math.PI * 2)
        ctx.fill()
    }

    const left = 96
    const width = W - left * 2

    // The site's name in its gradient
    ctx.font = `700 64px ${DISPLAY}`
    const brand = ctx.createLinearGradient(left, 0, left + ctx.measureText('MAP OF PSY').width, 0)
    GRADIENT.forEach((c, i) => brand.addColorStop(i / (GRADIENT.length - 1), c))
    ctx.fillStyle = brand
    ctx.textBaseline = 'top'
    ctx.fillText('MAP OF PSY', left, 150)
    ctx.font = `400 30px ${MONO}`
    ctx.fillStyle = MUTED
    ctx.fillText('PSY GALAXY + EVENT TRACKER', left, 236)

    // Who plays where
    let y = 560
    ctx.font = `400 38px ${MONO}`
    ctx.fillStyle = ACCENT
    ctx.fillText('// I PLAY AT', left, y)
    y += 90

    const eventSize = fit(ctx, event.nameParty, DISPLAY, 700, 120, width, 4)
    ctx.font = `700 ${eventSize}px ${DISPLAY}`
    ctx.fillStyle = FG
    for (const line of lines(ctx, event.nameParty, width, 4)) {
        ctx.fillText(line, left, y)
        y += eventSize * 1.15
    }

    y += 50
    ctx.fillStyle = ACCENT
    ctx.fillRect(left, y, 6, 150)
    ctx.font = `400 46px ${MONO}`
    ctx.fillStyle = FG
    const when = event.dateStart ? DAY.format(new Date(event.dateStart + 'T12:00:00')) : 'Date to be announced'
    ctx.fillText(when, left + 40, y + 10)
    ctx.fillStyle = MUTED
    const where = [event.nameTown, event.nameCountry].filter(Boolean).join(', ')
    for (const line of lines(ctx, where, width - 40, 2)) {
        ctx.fillText(line, left + 40, y + 80)
        y += 60
    }

    // The artist, at the bottom
    const nameSize = fit(ctx, artistName, DISPLAY, 700, 110, width, 2)
    ctx.font = `700 ${nameSize}px ${DISPLAY}`
    ctx.fillStyle = FG
    const nameLines = lines(ctx, artistName, width, 2)
    let ny = H - 300 - nameLines.length * nameSize * 1.1
    for (const line of nameLines) {
        ctx.fillText(line, left, ny)
        ny += nameSize * 1.1
    }
    ctx.font = `400 30px ${MONO}`
    ctx.fillStyle = MUTED
    ctx.fillText(`${SITE_URL.replace('https://', '')}/events/${event.id}`, left, H - 180)

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}
