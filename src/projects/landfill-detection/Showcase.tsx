import { useEffect, useState } from 'react';
import { LANDFILL_DEMO_URL } from './meta';

// after this long without the demo having loaded, a hint with a link to open
// it in its own tab is shown, in case the server is slow or unreachable
const SLOW_AFTER = 12000; // milliseconds

// The live system, shown inside the panel: the real web application of the
// project, loaded from its server in an iframe (a page inside the page).
export default function LandfillShowcase() {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="embedded-demo">
      <iframe
        src={LANDFILL_DEMO_URL}
        title="Live demo: illegal landfill detection and risk assessment"
        // the map's "locate me" button asks for the visitor's location
        allow="geolocation"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="embedded-demo-status">
          <span className="embedded-demo-spinner" aria-hidden="true" />
          <p>Starting the live demo…</p>
          {slow && (
            <p>
              The server is taking a while.{' '}
              <a href={LANDFILL_DEMO_URL} target="_blank" rel="noreferrer">
                Open it in a new tab
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
