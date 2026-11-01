import { useEffect, useState } from 'react';
import { useFullscreen } from '../../ui/fullscreen';
import { resetApi } from './cloud/api';
import { setSession, SIGNED_OUT } from './cloud/session';
import { getCloud, resetCloud } from './cloud/state';
import { CloudView } from './ui/CloudView';
import { Inbox, Tables } from './ui/DataView';
import { MoviesApp } from './ui/MoviesApp';
import './movies.css';

// The serverless movie platform, simulated in the browser instead of
// deployed (AWS has no hard spending cap, and a portfolio shouldn't cost
// money): the Angular app rebuilt on the left, and on the right the AWS side
// as serverless.yml defines it - API Gateway routes and JWT authorizers, the
// Lambda functions ported from Python, and DynamoDB, S3, SNS and Cognito
// holding their data in memory.

type Tab = 'requests' | 'data' | 'inbox';

export default function MoviesShowcase() {
  const [tab, setTab] = useState<Tab>('requests');
  const [version, setVersion] = useState(0); // a new app after a reset
  const [, setTick] = useState(0);
  const {
    ref: fullscreenRef,
    active: fullscreen,
    supported: canFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen<HTMLDivElement>();

  // the inbox badge and the tables follow the simulated cloud
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 500);
    return () => clearInterval(timer);
  }, []);

  const refresh = () => setTick((tick) => tick + 1);
  const unread = getCloud().sns.inbox.filter((email) => !email.read).length;

  const reset = () => {
    resetCloud();
    resetApi();
    setSession(SIGNED_OUT);
    setVersion((value) => value + 1);
    setTab('requests');
  };

  return (
    <div ref={fullscreenRef} className="mc" data-fullscreen={fullscreen}>
      <header className="mc-bar">
        <span className="mc-bar-title">
          Simulated AWS{' '}
          <span className="mc-muted">
            · eu-central-1 · runs in your browser, nothing is deployed
          </span>
        </span>
        <button
          type="button"
          className="mc-bar-button"
          onClick={reset}
          title="Back to the starting data"
        >
          Reset
        </button>
        {canFullscreen && (
          <button
            type="button"
            className="mc-bar-button mc-icon-button"
            onClick={() => toggleFullscreen()}
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
        )}
      </header>

      <div className="mc-body">
        <MoviesApp key={version} onInbox={refresh} />

        <aside className="mc-side">
          <div className="mc-tabs" role="tablist">
            {(
              [
                ['requests', 'Requests'],
                ['data', 'Data'],
                ['inbox', unread ? `Inbox (${unread})` : 'Inbox'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mc-tab" role="tabpanel">
            {tab === 'requests' && <CloudView key={version} />}
            {tab === 'data' && <Tables />}
            {tab === 'inbox' && <Inbox onChange={refresh} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
