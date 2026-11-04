// The site's color theme: "cosmic" (the usual look) or "contrast" (high contrast: black background, white
// text, bright scene colors, thicker lines; easier to read for weaker eyes and outside in the sun).
// It starts from the system setting (prefers-contrast: more) and the visitor can switch it in the navbar;
// the choice is remembered in the browser. It shows as <html data-theme="contrast">.
// The galaxy is drawn once with its colors, so switching reloads the page.

const KEY = 'theme'

function read() {
    try {
        const saved = localStorage.getItem(KEY)
        if (saved === 'contrast' || saved === 'cosmic') return saved
    } catch {
        // Storage can be blocked (private mode); fall back to the system setting
    }
    return window.matchMedia?.('(prefers-contrast: more)').matches ? 'contrast' : 'cosmic'
}

export const theme = read()
export const highContrast = theme === 'contrast'
if (highContrast) document.documentElement.setAttribute('data-theme', 'contrast')

export function setTheme(value) {
    try {
        localStorage.setItem(KEY, value)
    } catch {
        // Not remembered; applied for this visit only
        document.documentElement.toggleAttribute('data-theme', value === 'contrast')
        if (value === 'contrast') document.documentElement.setAttribute('data-theme', 'contrast')
        return
    }
    window.location.reload()
}

/** Scene colors in the high contrast theme: full and bright on black, still told apart from each other */
export const CONTRAST_SCENES = {
    goa: '#ffb020',
    prog: '#00f0c0',
    dark: '#ff5cf4',
    chill: '#4db8ff',
    roots: '#e6e6e6',
}
