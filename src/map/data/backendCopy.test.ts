import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The backend keeps its own copy of the map files (src/main/resources/map) and serves it to the site, where it wins
// over the bundled one. An edit made to only one copy goes unnoticed until the site shows stale data, so on a computer
// that has both repositories side by side the two copies must match. In CI (only this repository) the check is skipped.
const backendMap = fileURLToPath(new URL('../../../../psytrance-tracker-backend/src/main/resources/map/', import.meta.url));
const here = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe.skipIf(!existsSync(backendMap))('backend copy of the map data', () => {
  it.each(['genres.json', 'festivals.json', 'labels.json', 'artists.json', 'appearances.json'])('%s is the same in the backend', (file) => {
    expect(read(backendMap + file), `${file} differs: copy src/map/data/${file} to the backend`).toEqual(read(here(file)));
  });
});
