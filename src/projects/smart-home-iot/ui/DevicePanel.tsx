import type { ReactNode } from 'react';
import { visitor } from '../sim/actions';
import { DEVICES, IR_COLORS, PI_LABELS, RGB_CSS, type DeviceId } from '../sim/devices';
import type { HomeEngine } from '../sim/engine';
import { formatClock } from '../sim/time';

// The device picked on the plan: what it is, what it reports right now, and
// what the visitor can do with it.

interface DevicePanelProps {
  engine: HomeEngine;
  device: DeviceId | null;
  onChange: () => void; // after an action, so the view updates at once
  onClose: () => void;
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function currentValue(engine: HomeEngine, device: DeviceId): string {
  const last = engine.lastSeen.get(device);
  const ago = last ? ` (at ${formatClock(last.at)})` : '';
  switch (device) {
    case 'DS1':
    case 'DS2':
      return engine.doors[device] ? 'Open' : 'Closed';
    case 'DUS1':
    case 'DUS2':
      return `${engine.distance(device === 'DUS1' ? 1 : 2).toFixed(1)} cm`;
    case 'DPIR1':
    case 'DPIR2':
    case 'DPIR3':
      return last ? `Last motion at ${formatClock(last.at)}` : 'No motion yet today';
    case 'DL':
      return engine.doorLight ? 'On' : 'Off';
    case 'DB':
      return engine.buzzer ? 'Sounding' : 'Silent';
    case 'DMS':
      return engine.pinBuffer
        ? `Typed: ${'•'.repeat(engine.pinBuffer.length)}`
        : 'Waiting for a PIN';
    case 'BRGB':
      return engine.rgb === 'off' ? 'Off' : engine.rgb.replace('_', ' ');
    case 'IR':
      return last ? `Last button: ${String(last.value)}${ago}` : 'No button pressed yet';
    case 'BTN':
      return `Adds ${engine.btnAddSeconds} s per press`;
    case '4SD':
      if (engine.stopwatchBlinking) return 'Time is up (blinking)';
      if (engine.stopwatchRunning) return `${engine.stopwatchTime} s left`;
      return 'Showing the time';
    case 'GSG':
      return engine.alarmActive && engine.alarmReason.includes('icon') ? 'Moved!' : 'Steady';
    case 'LCD':
      return engine.lcdText().join(' · ') || 'Waiting for readings';
    case 'DHT1':
    case 'DHT2':
    case 'DHT3': {
      const { temperature, humidity } = engine.climate(device);
      return `${temperature.toFixed(1)} °C, ${humidity.toFixed(1)} %`;
    }
    case 'WEBC':
      return 'Streams to the dashboard (not part of the simulation)';
  }
}

export function DevicePanel({ engine, device, onChange, onClose }: DevicePanelProps) {
  if (!device) {
    return (
      <div className="home-device-panel home-device-panel-empty">
        Click a device on the plan to see what it reports and to use it: open a door, walk in, type
        the PIN, press the remote.
      </div>
    );
  }

  const info = DEVICES[device];
  const act = (action: () => void) => () => {
    action();
    onChange();
  };

  let actions: ReactNode = null;
  if (device === 'DS1' || device === 'DS2' || device === 'DUS1' || device === 'DUS2') {
    const door = device.endsWith('1') ? 1 : 2;
    const open = engine.doors[door === 1 ? 'DS1' : 'DS2'] === 1;
    actions = (
      <>
        <button type="button" onClick={act(() => visitor.walkIn(engine, door))}>
          Walk in
        </button>
        <button type="button" onClick={act(() => visitor.walkOut(engine, door))}>
          Walk out
        </button>
        <button type="button" onClick={act(() => visitor.toggleDoor(engine, door))}>
          {open ? 'Close the door' : 'Open the door'}
        </button>
      </>
    );
  } else if (device === 'DPIR1' || device === 'DPIR2' || device === 'DPIR3') {
    actions = (
      <button type="button" onClick={act(() => visitor.motion(engine, device))}>
        Wave at the sensor
      </button>
    );
  } else if (device === 'DMS') {
    actions = (
      <div className="home-keypad">
        {KEYPAD.map((key) => (
          <button key={key} type="button" onClick={act(() => visitor.key(engine, key))}>
            {key}
          </button>
        ))}
      </div>
    );
  } else if (device === 'BTN') {
    actions = (
      <button type="button" onClick={act(() => visitor.button(engine))}>
        Press the button
      </button>
    );
  } else if (device === 'GSG') {
    actions = (
      <button type="button" onClick={act(() => visitor.bumpIcon(engine))}>
        Bump the icon
      </button>
    );
  } else if (device === 'IR' || device === 'BRGB') {
    actions = (
      <div className="home-remote">
        {Object.entries(IR_COLORS).map(([key, color]) => (
          <button
            key={key}
            type="button"
            onClick={act(() => visitor.remote(engine, key))}
            title={color.replace('_', ' ')}
          >
            <span className="home-swatch" style={{ background: RGB_CSS[color] ?? '#3d362a' }} />
            {key}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="home-device-panel" data-pi={info.pi}>
      <div className="home-device-panel-head">
        <span className="home-pi-dot" aria-hidden="true" />
        <strong>{info.name}</strong>
        <span className="home-muted">
          {device} · {PI_LABELS[info.pi]}
        </span>
        <button type="button" className="home-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <p className="home-device-description">{info.description}</p>
      <dl className="home-device-facts">
        <dt>Now</dt>
        <dd>{currentValue(engine, device)}</dd>
        <dt>MQTT</dt>
        <dd>
          <code>{info.topic}</code>
        </dd>
      </dl>
      {actions && <div className="home-actions">{actions}</div>}
    </div>
  );
}
