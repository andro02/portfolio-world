import { useState, type FormEvent } from 'react';
import { visitor } from '../sim/actions';
import type { HomeEngine } from '../sim/engine';

// The project's web dashboard (frontend/index.html and script.js): alarm and
// PIN, the bedroom's RGB light and the kitchen timer, calling the same Flask
// routes. Its live camera and Grafana panels are left out; the plan and the
// History tab take their place.

interface DashboardProps {
  engine: HomeEngine;
  onChange: () => void;
}

const COLORS = [
  { color: 'red', label: 'Red' },
  { color: 'green', label: 'Green' },
  { color: 'blue', label: 'Blue' },
  { color: 'white', label: 'White' },
  { color: 'off', label: 'Off' },
];

function securityText(engine: HomeEngine): string {
  switch (engine.security) {
    case 'alarm':
      return `Alarm! ${engine.alarmReason}.`;
    case 'armed':
      return 'The system is armed.';
    case 'arming':
      return 'Arming… leave the house.';
    default:
      return 'Security is off.';
  }
}

export function Dashboard({ engine, onChange }: DashboardProps) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [seconds, setSeconds] = useState('');
  const [n, setN] = useState('');

  const deactivate = (event: FormEvent) => {
    event.preventDefault();
    if (!pin) {
      setMessage({ ok: false, text: 'Please enter the PIN.' });
      return;
    }
    const ok = engine.deactivateFromDashboard(pin);
    setMessage(ok ? { ok: true, text: 'Deactivated.' } : { ok: false, text: 'Wrong PIN.' });
    if (ok) setPin('');
    onChange();
  };

  const setTime = (event: FormEvent) => {
    event.preventDefault();
    const value = Math.round(Number(seconds));
    if (!(value > 0)) return;
    visitor.web(engine, {
      path: '/api/stopwatch',
      action: 'set_time',
      time: Math.min(value, 5999),
    });
    setSeconds('');
    onChange();
  };

  const setStep = (event: FormEvent) => {
    event.preventDefault();
    const value = Math.round(Number(n));
    if (!(value > 0)) return;
    visitor.web(engine, { path: '/api/stopwatch', action: 'set_n', n: Math.min(value, 600) });
    setN('');
    onChange();
  };

  const minutes = String(Math.floor(engine.stopwatchTime / 60)).padStart(2, '0');
  const remaining = String(engine.stopwatchTime % 60).padStart(2, '0');

  return (
    <div className="home-dashboard">
      <section className="home-card" data-security={engine.security}>
        <h4>Security and alarm</h4>
        <p className="home-security-text">{securityText(engine)}</p>
        <form className="home-row" onSubmit={deactivate}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN (1111)"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            aria-label="PIN"
          />
          <button type="submit">Deactivate</button>
        </form>
        {message && (
          <p className="home-form-message" data-ok={message.ok}>
            {message.text}
          </p>
        )}
        <p className="home-hint">
          Arming happens at the keypad by the front door (DMS on the plan): type the PIN there.
        </p>
      </section>

      <section className="home-card">
        <h4>RGB lighting · bedroom</h4>
        <div className="home-colors">
          {COLORS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              data-color={color}
              data-current={engine.rgb === color}
              onClick={() => {
                visitor.web(engine, { path: '/api/rgb', color });
                onChange();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="home-card">
        <h4>Kitchen timer</h4>
        <p className="home-timer" data-blink={engine.stopwatchBlinking}>
          {minutes}:{remaining}
        </p>
        <form className="home-row" onSubmit={setTime}>
          <input
            type="number"
            min={1}
            placeholder="Seconds, e.g. 120"
            value={seconds}
            onChange={(event) => setSeconds(event.target.value)}
            aria-label="Timer seconds"
          />
          <button type="submit">Set time</button>
        </form>
        <form className="home-row" onSubmit={setStep}>
          <input
            type="number"
            min={1}
            placeholder={`Button adds N (now ${engine.btnAddSeconds})`}
            value={n}
            onChange={(event) => setN(event.target.value)}
            aria-label="Seconds per button press"
          />
          <button type="submit">Set N</button>
        </form>
      </section>
    </div>
  );
}
