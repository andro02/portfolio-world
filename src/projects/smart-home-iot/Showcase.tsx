import { useCallback, useEffect, useRef, useState } from 'react';
import { useFullscreen } from '../../ui/fullscreen';
import type { DeviceId } from './sim/devices';
import { HomeEngine } from './sim/engine';
import { formatClock } from './sim/time';
import { Dashboard } from './ui/Dashboard';
import { DevicePanel } from './ui/DevicePanel';
import { FloorPlan } from './ui/FloorPlan';
import { History } from './ui/History';
import { MessageLog } from './ui/MessageLog';
import './smartHome.css';

// The smart home, simulated in the browser: the residents' day is generated
// from the date (sim/schedule.ts), the devices report what they would, and
// the project's server logic (server.py, ported in sim/engine.ts) reacts.
// When the panel opens, today is replayed from midnight up to now, so the
// house is in the same state for every visitor; from then on the visitor can
// speed time up and use the devices.

const SPEEDS = [1, 60, 600];

// read in event handlers and timers only
const realTime = () => performance.now();
const TICK_MS = 100;

type Tab = 'dashboard' | 'log' | 'history';

const SECURITY_LABEL = {
  disarmed: 'Security off',
  arming: 'Arming…',
  armed: 'Armed',
  alarm: 'ALARM',
};

function Banner({ engine }: { engine: HomeEngine }) {
  const seconds = (until: number) => Math.max(0, Math.ceil((until - engine.now) / 1000));
  if (engine.alarmActive) {
    return (
      <div className="home-banner" data-tone="alarm" role="alert">
        <strong>Alarm:</strong> {engine.alarmReason}. The PIN (1111) on the keypad or the dashboard
        turns it off.
      </div>
    );
  }
  if (engine.intrusionUntil > engine.now) {
    return (
      <div className="home-banner" data-tone="warning">
        Door opened while armed: {seconds(engine.intrusionUntil)} s to enter the PIN.
      </div>
    );
  }
  if (engine.security === 'arming') {
    return (
      <div className="home-banner" data-tone="info">
        Arming in {seconds(engine.armingUntil)} s.
      </div>
    );
  }
  return null;
}

export default function SmartHomeShowcase() {
  const [engine, setEngine] = useState(() => new HomeEngine(Date.now()));
  const [speed, setSpeed] = useState(1);
  const [live, setLive] = useState(true); // following the real clock
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selected, setSelected] = useState<DeviceId | null>(null);
  const [realNow, setRealNow] = useState(0);
  const {
    ref: fullscreenRef,
    active: fullscreen,
    supported: canFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen<HTMLDivElement>();

  // the simulated time runs from an anchor: at real time `real` it was `sim`
  const clock = useRef({ sim: 0, real: 0, speed: 1 });
  const lastTarget = useRef(0);

  const refresh = useCallback(() => setRealNow(realTime()), []);

  useEffect(() => {
    // a new engine starts at the real time
    clock.current = { sim: engine.now, real: performance.now(), speed: 1 };
    lastTarget.current = engine.now;
    const timer = setInterval(() => {
      const real = performance.now();
      const { sim, real: anchor, speed: rate } = clock.current;
      const target = sim + (real - anchor) * rate;
      engine.advanceTo(target, real, lastTarget.current);
      lastTarget.current = target;
      setRealNow(real);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [engine]);

  const reanchor = (rate: number) => {
    clock.current = { sim: engine.now, real: realTime(), speed: rate };
    lastTarget.current = engine.now;
  };

  const changeSpeed = (rate: number) => {
    reanchor(rate);
    setSpeed(rate);
    if (rate !== 1) setLive(false);
  };

  // jumps to just before the next thing the residents do
  const skipToNext = () => {
    const next = engine.nextEventAt(engine.now + 1500);
    if (next === undefined) return;
    engine.advanceTo(next - 1500);
    reanchor(speed);
    setLive(false);
    refresh();
  };

  // back to the real time: today replayed again (what the visitor did is
  // forgotten, since the past can't be changed afterwards)
  const backToLive = () => {
    setEngine(new HomeEngine(Date.now()));
    setSpeed(1);
    setLive(true);
  };

  const date = new Date(engine.now);
  const security = engine.security;

  return (
    <div ref={fullscreenRef} className="home" data-security={security} data-fullscreen={fullscreen}>
      <header className="home-bar">
        <div className="home-clock">
          <span className="home-time">{formatClock(engine.now)}</span>
          <span className="home-date">
            {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            <span className="home-muted">
              {' '}
              · {live ? 'live, simulated' : `simulated, ${speed}×`}
            </span>
          </span>
        </div>
        <div className="home-status">
          <span className="home-pill">
            {engine.peopleCount === 0 ? 'Nobody home' : `${engine.peopleCount} at home`}
          </span>
          <span className="home-pill" data-security={security}>
            {SECURITY_LABEL[security]}
          </span>
        </div>
        <div className="home-controls">
          <div className="home-speeds" role="group" aria-label="Simulation speed">
            {SPEEDS.map((rate) => (
              <button
                key={rate}
                type="button"
                data-current={speed === rate}
                onClick={() => changeSpeed(rate)}
                title={rate === 1 ? 'Real time' : `${rate} times faster`}
              >
                {rate}×
              </button>
            ))}
          </div>
          <button
            type="button"
            className="home-button"
            onClick={skipToNext}
            title="Jump to the next thing that happens"
          >
            Next event
          </button>
          {!live && (
            <button
              type="button"
              className="home-button"
              onClick={backToLive}
              title="Back to the real time"
            >
              Live
            </button>
          )}
          {/* the plan gets much bigger over the whole screen (not on iPhones,
              which can't show a part of a page full screen) */}
          {canFullscreen && (
            <button
              type="button"
              className="home-button home-icon-button"
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
        </div>
      </header>

      <div className="home-body">
        <div className="home-main">
          <div className="home-plan-wrap">
            <FloorPlan
              engine={engine}
              realNow={realNow}
              selected={selected}
              onSelect={setSelected}
            />
            <Banner engine={engine} />
          </div>
          <div className="home-pis">
            <span data-pi="PI1">Pi 1 · front door</span>
            <span data-pi="PI2">Pi 2 · kitchen and back door</span>
            <span data-pi="PI3">Pi 3 · bedrooms and living room</span>
          </div>
          <DevicePanel
            engine={engine}
            device={selected}
            onChange={refresh}
            onClose={() => setSelected(null)}
          />
        </div>

        <aside className="home-side">
          <div className="home-tabs" role="tablist">
            {(
              [
                ['dashboard', 'Dashboard'],
                ['log', 'MQTT messages'],
                ['history', 'History'],
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
          <div className="home-tab" role="tabpanel">
            {tab === 'dashboard' && <Dashboard engine={engine} onChange={refresh} />}
            {tab === 'log' && <MessageLog engine={engine} />}
            {tab === 'history' && <History engine={engine} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
