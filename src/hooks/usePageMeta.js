import { useEffect } from 'react'

export const SITE_URL = 'https://psyatlas-one.vercel.app'
const SITE_NAME = 'Map of Psy'
const DEFAULT_DESCRIPTION =
    'Find upcoming psytrance festivals and parties around the world. Browse psytrance events by country and subgenre, see them on a world map and check who plays where.'

function setMeta(attribute, key, content) {
    let tag = document.head.querySelector(`meta[${attribute}="${key}"]`)
    if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attribute, key)
        document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
}

function setCanonical(href) {
    let tag = document.head.querySelector('link[rel="canonical"]')
    if (!tag) {
        tag = document.createElement('link')
        tag.setAttribute('rel', 'canonical')
        document.head.appendChild(tag)
    }
    tag.setAttribute('href', href)
}

// Title, description and canonical URL of the current page, so search results and link previews
// show what the page is about instead of the same text for every URL
export default function usePageMeta({ title, description = DEFAULT_DESCRIPTION, path, noindex = false }) {
    useEffect(() => {
        const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} – Psytrance Festivals & Parties Worldwide`
        const url = SITE_URL + (path ?? window.location.pathname)

        document.title = fullTitle
        setMeta('name', 'description', description)
        setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow')
        setMeta('property', 'og:title', fullTitle)
        setMeta('property', 'og:description', description)
        setMeta('property', 'og:url', url)
        setMeta('name', 'twitter:title', fullTitle)
        setMeta('name', 'twitter:description', description)
        setCanonical(url)
    }, [title, description, path, noindex])
}
