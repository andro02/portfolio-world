import { useEffect, useRef, useState } from 'react';

// after this long without the demo having loaded, a hint with a link to open
// it in its own tab is shown, in case the server is slow or unreachable
const SLOW_AFTER = 12000; // milliseconds

// while the demo isn't answering, it is checked again this often, this many
// times (about five minutes, enough for a backend to start), then only on a
// click
const RETRY_EVERY = 20000; // milliseconds
const MAX_RETRIES = 15;

// what api/demo-status.js found:
// up      - working
// busy    - working, but answering slowly
// down    - the server answers, its backend doesn't (starting or stopped)
// offline - the server can't be reached
type DemoHealth = 'up' | 'busy' | 'down' | 'offline';

// Asks the portfolio's own function whether the demo is answering. Anything
// unexpected (no such function in `pnpm dev`, a network error) counts as up:
// then the demo is simply shown, as it was before there was a check.
async function checkHealth(project: string): Promise<DemoHealth> {
  try {
    const response = await fetch(`/api/demo-status?project=${encodeURIComponent(project)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return 'up';
    const { state } = (await response.json()) as { state?: string };
    if (state === 'down' || state === 'offline') return state;
    if (state === 'slow') return 'busy';
    return 'up';
  } catch {
    return 'up';
  }
}

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
  // the project's slug in api/demo-status.js; without it there is no check
  statusCheck?: string;
  // shown when the demo is down, so there is still something to look at
  sourceUrl?: string;
}

// A project's live web application inside its panel: a small bar on top (the
// address, reload, full screen, open in a new tab) and the application itself
// in an iframe, a page inside the page. Before it is shown, a quick check
// makes sure its server is answering; if it isn't, a message replaces the
// browser's error page.
export function EmbeddedDemo({ url, title, allow, statusCheck, sourceUrl }: EmbeddedDemoProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // changing it makes React create a new iframe, which loads the page again
  const [reloadCount, setReloadCount] = useState(0);

  // optimistic: the page starts loading right away, next to the check, so a
  // working demo isn't delayed by it; the check only decides what is visible
  const [health, setHealth] = useState<DemoHealth>('up');
  const [checking, setChecking] = useState(Boolean(statusCheck));
  const [checkCount, setCheckCount] = useState(0); // a change runs a check
  const [retries, setRetries] = useState(0);
  const [busyNoteClosed, setBusyNoteClosed] = useState(false);

  const isDown = health === 'down' || health === 'offline';

  useEffect(() => {
    if (!statusCheck) return;
    let cancelled = false;
    void checkHealth(statusCheck).then((result) => {
      if (cancelled) return;
      setHealth(result);
      setChecking(false);
      // the iframe goes away while the demo is down, and loads anew after
      if (result === 'down' || result === 'offline') {
        setLoaded(false);
        setSlow(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [statusCheck, checkCount]);

  const runCheck = () => {
    setChecking(true);
    setCheckCount((count) => count + 1);
  };

  // while down, check again now and then, so a backend that was starting
  // appears on its own
  useEffect(() => {
    if (!isDown || checking || retries >= MAX_RETRIES) return;
    const timer = setTimeout(() => {
      setRetries((count) => count + 1);
      setChecking(true);
      setCheckCount((count) => count + 1);
    }, RETRY_EVERY);
    return () => clearTimeout(timer);
  }, [isDown, checking, retries]);

  const tryAgain = () => {
    setRetries(0);
    runCheck();
  };

  // counted from when the iframe starts loading (again)
  useEffect(() => {
    if (isDown) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER);
    return () => clearTimeout(timer);
  }, [reloadCount, isDown]);

  // the iframe has no browser reload button of its own
  const reload = () => {
    setLoaded(false);
    setSlow(false);
    setReloadCount((count) => count + 1);
    setRetries(0);
    setBusyNoteClosed(false);
    if (statusCheck) runCheck();
  };

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
    <div
      ref={frame}
      className="embedded-demo"
      data-fullscreen={fullscreen}
      data-health={checking && !isDown ? 'checking' : health}
    >
      <div className="embedded-demo-bar">
        <span className="embedded-demo-live" aria-hidden="true" />
        <span className="embedded-demo-address">{new URL(url).host}</span>
        <button
          type="button"
          className="embedded-demo-action"
          onClick={reload}
          aria-label="Reload"
          title="Reload"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
          </svg>
        </button>
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

      {health === 'busy' && !busyNoteClosed && (
        <div className="embedded-demo-note" role="status">
          <span>
            The server is busy right now, so the first clicks can take a while. It runs on a small
            free machine.
          </span>
          <button
            type="button"
            className="embedded-demo-action"
            onClick={() => setBusyNoteClosed(true)}
            aria-label="Close"
            title="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="embedded-demo-view">
        {isDown ? (
          <div className="embedded-demo-status embedded-demo-down" role="status">
            <svg className="embedded-demo-down-icon" viewBox="0 0 24 24" aria-hidden="true">
              {/* an unplugged plug */}
              <path d="M9 2v4M15 2v4M6 6h12v4a6 6 0 0 1-12 0zM12 16v6M3 3l18 18" />
            </svg>
            <h3>
              {health === 'down' ? 'The live demo is starting up' : 'The live demo is offline'}
            </h3>
            <p>
              {health === 'down'
                ? "Its server is up, but the backend isn't answering yet. On this small free server, starting can take a few minutes."
                : "Its server can't be reached right now, maybe for maintenance. Please try again later."}
            </p>
            {retries < MAX_RETRIES && (
              <p className="embedded-demo-muted">Checking again automatically…</p>
            )}
            <div className="embedded-demo-buttons">
              <button type="button" onClick={tryAgain} disabled={checking}>
                {checking ? 'Checking…' : 'Try again'}
              </button>
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  View the code
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <iframe
              key={reloadCount}
              src={url}
              title={title}
              allow={allow}
              referrerPolicy="no-referrer"
              onLoad={() => setLoaded(true)}
            />
            {(!loaded || checking) && (
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
          </>
        )}
      </div>
    </div>
  );
}
