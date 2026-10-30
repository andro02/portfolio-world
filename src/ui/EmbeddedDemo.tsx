import { useEffect, useRef, useState } from 'react';

// after this long without the demo having loaded, a hint with a link to open
// it in its own tab is shown, in case the server is slow or unreachable
const SLOW_AFTER = 12000; // milliseconds

// Safari before 16.4 only has the prefixed versions of the fullscreen API
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

// true if the browser can show an element over the whole screen (iPhones can't)
function canGoFullscreen(element: FullscreenElement) {
  return Boolean(element.requestFullscreen ?? element.webkitRequestFullscreen);
}

function enterFullscreen(element: FullscreenElement) {
  if (element.requestFullscreen) void element.requestFullscreen();
  else element.webkitRequestFullscreen?.();
}

function exitFullscreen() {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) void doc.exitFullscreen();
  else doc.webkitExitFullscreen?.();
}

interface EmbeddedDemoProps {
  url: string;
  title: string; // describes the page for screen readers
  allow?: string; // browser features the page may use, e.g. "geolocation"
}

// A project's live web application inside its panel: a small bar on top (the
// address, full screen, open in a new tab) and the application itself in an
// iframe, a page inside the page.
export function EmbeddedDemo({ url, title, allow }: EmbeddedDemoProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER);
    return () => clearTimeout(timer);
  }, []);

  // follow full screen however it ends (the button, or the browser's Escape)
  useEffect(() => {
    const onChange = () => setFullscreen(fullscreenElement() === frame.current);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const element = frame.current;
    if (!element) return;
    if (fullscreen) exitFullscreen();
    else if (canGoFullscreen(element)) enterFullscreen(element);
    // without a fullscreen API, a tab of its own is the biggest it can get
    else window.open(url, '_blank', 'noreferrer');
  };

  return (
    <div ref={frame} className="embedded-demo" data-fullscreen={fullscreen}>
      <div className="embedded-demo-bar">
        <span className="embedded-demo-live" aria-hidden="true" />
        <span className="embedded-demo-address">{new URL(url).host}</span>
        <button
          type="button"
          className="embedded-demo-action"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {fullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </svg>
        </button>
        <a
          className="embedded-demo-action"
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in a new tab"
          title="Open in a new tab"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
      </div>

      <div className="embedded-demo-view">
        <iframe
          src={url}
          title={title}
          allow={allow}
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
                <a href={url} target="_blank" rel="noreferrer">
                  Open it in a new tab
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
