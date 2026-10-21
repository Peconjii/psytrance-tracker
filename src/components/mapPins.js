import L from 'leaflet'

// Map pins in the Map of Psy style: a small star (bright core, ring, soft glow) instead of Leaflet's blue drop.
// Drawn with CSS (.map-pin in site.css), so they need no image files and take any color.
function starPin(color, size = 18) {
    return L.divIcon({
        className: 'map-pin-wrap',
        html: `<span class="map-pin" style="--pin:${color};--pin-size:${size}px"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    })
}

/** An event on the map */
export const eventPin = starPin('#3ee6c4')
/** An event that matches the search on the world map */
export const matchPin = starPin('#ffd36e', 22)
