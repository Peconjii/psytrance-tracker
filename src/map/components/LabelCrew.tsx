import { useEffect, useState } from 'react';
import { fetchLabelPage } from '../../api/backend.js';

/**
 * The artists on a label in its panel: the crew as the site has it now (the map's, with the changes admins
 * approved for the label's owner), and the map's own list until that loads or when the backend can't be reached.
 */
export function LabelCrew({ label, mapCrew, onOpenArtist }: { label: string; mapCrew: string[]; onOpenArtist: (name: string) => void }) {
  // Tagged with the label, so another label's crew never shows while this one loads
  const [loaded, setLoaded] = useState<{ label: string; crew: string[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchLabelPage(label, controller.signal)
      .then((page: { crew: string[] }) => setLoaded({ label, crew: page.crew }))
      .catch(() => { /* the map's list stays */ });
    return () => controller.abort();
  }, [label]);

  const crew = loaded?.label === label ? loaded.crew : mapCrew;
  if (!crew.length) return null;
  return (
    <>
      <div className="hud__label">Artists on this label</div>
      <div className="hud__chips">
        {crew.map((a) => (
          <button key={a} className="hud__chip" onClick={() => onOpenArtist(a)}>{a}</button>
        ))}
      </div>
    </>
  );
}
