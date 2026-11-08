import { describe, expect, it } from 'vitest'
import { cleanYouTubeLink, youtubeIdOf } from './youtube.js'

describe('YouTube links', () => {
    it('finds the id in the links people paste', () => {
        for (const link of [
            'https://www.youtube.com/watch?v=M8JdLqo5NcU&list=RDM8JdLqo5NcU&start_radio=1&t=4202s',
            'https://youtu.be/M8JdLqo5NcU?si=abc',
            'https://m.youtube.com/watch?feature=share&v=M8JdLqo5NcU',
            'https://music.youtube.com/watch?v=M8JdLqo5NcU',
            'https://www.youtube.com/shorts/M8JdLqo5NcU',
            'https://www.youtube.com/live/M8JdLqo5NcU?feature=share',
            'M8JdLqo5NcU',
        ]) expect(youtubeIdOf(link)).toBe('M8JdLqo5NcU')
    })
    it('keeps a dash at the start and spots a cut id', () => {
        expect(youtubeIdOf('https://www.youtube.com/watch?v=-bPk_7KcJxk')).toBe('-bPk_7KcJxk')
        expect(youtubeIdOf('bPk_7KcJxk')).toBe(null)
    })
    it('writes YouTube links back clean and leaves other links alone', () => {
        expect(cleanYouTubeLink('https://www.youtube.com/watch?v=M8JdLqo5NcU&list=RD&t=4202s')).toBe('https://www.youtube.com/watch?v=M8JdLqo5NcU')
        expect(cleanYouTubeLink('M8JdLqo5NcU')).toBe('M8JdLqo5NcU')
        expect(cleanYouTubeLink('https://soundcloud.com/atriohm')).toBe('https://soundcloud.com/atriohm')
    })
})
