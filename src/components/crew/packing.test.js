import { describe, expect, it } from 'vitest'
import { openSuggestions, typeSuggestions, weatherSuggestions } from './packing.js'

const names = (list) => list.map((s) => s.name)

describe('crew packing suggestions', () => {
    it('suggests camping things for open airs but not for clubs', () => {
        expect(names(typeSuggestions('Open Air'))).toContain('Tent')
        expect(names(typeSuggestions('Club'))).not.toContain('Tent')
        expect(names(typeSuggestions('Club'))).toContain('Earplugs')
        expect(names(typeSuggestions('Festival', 'Forest gathering'))).toContain('Mosquito repellent')
    })

    it('reads rain, cold nights and heat from the forecast', () => {
        const days = [
            { date: '2026-06-06', max: 30, min: 6, rain: 10 },
            { date: '2026-06-07', max: 22, min: 12, rain: 70 },
        ]
        const out = weatherSuggestions(days, false)
        expect(out.find((s) => s.name === 'Raincoat').why).toBe('rain Sun')
        expect(out.find((s) => s.name === 'Warm sleeping bag').why).toBe('6°C at night')
        expect(names(out)).toContain('Hat for the sun')
        expect(weatherSuggestions(null, false)).toEqual([])
    })

    it('leaves out what is on the list already, whatever the case', () => {
        const open = openSuggestions([{ name: 'Tent', why: 'open air' }, { name: 'Water', why: 'always' }], [{ name: 'tent' }])
        expect(names(open)).toEqual(['Water'])
    })
})
