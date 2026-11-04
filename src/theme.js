// The site's color theme: "cosmic" (the usual look, the night sky) or "contrast" (high contrast: a printed
// star chart, black ink on light paper, dark strong scene colors, thicker lines; easy to read for weaker eyes
// and outside in the sun).
// It starts from the system setting (prefers-contrast: more) and the visitor can switch it in the navbar;
// the choice is remembered in the browser. It shows as <html data-theme="contrast">.
// The galaxy is drawn once with its colors, so switching reloads the page.

const KEY = 'theme'

function read() {
    // Outside a browser (tests) there is no page to color
    if (typeof window === 'undefined') return 'cosmic'
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
if (highContrast && typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', 'contrast')

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

/** Scene colors on the paper chart: dark, strong inks that stand out on light paper and from each other */
export const CONTRAST_SCENES = {
    goa: '#c45200',
    prog: '#007a62',
    dark: '#9b1fc4',
    chill: '#1652c8',
    roots: '#55534c',
}
