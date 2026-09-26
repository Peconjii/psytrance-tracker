// Dark basemap shared by every map. Esri's tiles work on any domain without an API key
// (Stadia and CARTO both show "API key required" on deployed sites).
// Note the {y}/{x} order: Esri's tile URLs put the row before the column.
export const DARK_TILES_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

export const DARK_TILES_ATTRIBUTION = 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'

// The dark gray basemap has no detail past this zoom level
export const DARK_TILES_MAX_ZOOM = 16
