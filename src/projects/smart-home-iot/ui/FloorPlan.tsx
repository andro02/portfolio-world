import type { HomeEngine } from '../sim/engine';
import { DEVICES, RGB_CSS, type DeviceId, type DhtId } from '../sim/devices';
import { formatClock } from '../sim/time';

// The house from above: rooms, doors and every device where it is mounted,
// each showing what it is doing. Devices can be clicked (see DevicePanel).

interface FloorPlanProps {
  engine: HomeEngine;
  realNow: number;
  selected: DeviceId | null;
  onSelect: (device: DeviceId) => void;
}

// where each device's marker is, in the plan's coordinates
const POSITIONS: Record<DeviceId, [number, number]> = {
  // entrance (Pi 1)
  DS1: [470, 390],
  DPIR1: [560, 360],
  DMS: [602, 372],
  DB: [452, 294],
  DL: [462, 446],
  DUS1: [526, 452],
  WEBC: [590, 446],
  // kitchen (Pi 2)
  DS2: [606, 186],
  DPIR2: [596, 128],
  DUS2: [672, 128],
  '4SD': [540, 79],
  BTN: [582, 79],
  DHT3: [446, 204],
  GSG: [536, 204],
  // rooms (Pi 3)
  DHT1: [62, 182],
  IR: [196, 62],
  BRGB: [128, 112],
  DHT2: [380, 182],
  LCD: [368, 249],
  DPIR3: [382, 382],
};

const ROOMS = [
  { id: 'bedroom', label: 'Bedroom', x: 30, y: 30, width: 200, height: 180 },
  { id: 'master', label: 'Master bedroom', x: 230, y: 30, width: 180, height: 180 },
  { id: 'kitchen', label: 'Kitchen', x: 410, y: 30, width: 220, height: 210 },
  { id: 'living', label: 'Living room', x: 30, y: 210, width: 380, height: 200 },
  { id: 'entrance', label: 'Entrance', x: 410, y: 240, width: 220, height: 170 },
];

// short labels on the markers
const SHORT: Partial<Record<DeviceId, string>> = { WEBC: 'CAM', GSG: 'GYRO' };

const PULSE_MS = 1600; // how long a device glows after it reported

function Marker({
  device,
  selected,
  active,
  pulse,
  onSelect,
}: {
  device: DeviceId;
  selected: boolean;
  active: boolean;
  pulse: number | null; // the reading's time, to restart the animation
  onSelect: (device: DeviceId) => void;
}) {
  const [x, y] = POSITIONS[device];
  const info = DEVICES[device];
  return (
    <g
      className="home-device"
      data-pi={info.pi}
      data-selected={selected}
      data-active={active}
      transform={`translate(${x} ${y})`}
      onClick={() => onSelect(device)}
      role="button"
      tabIndex={0}
      aria-label={`${info.name} (${device})`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(device);
        }
      }}
    >
      <title>{`${info.name} · ${info.pi}`}</title>
      {pulse !== null && <circle key={pulse} className="home-device-pulse" r="18" />}
      <circle className="home-device-dot" r="18" />
      <text className="home-device-label" dy="3.5">
        {SHORT[device] ?? device}
      </text>
    </g>
  );
}

// a door leaf, hinged at (x, y), swinging by angle when open
function Door({
  x,
  y,
  length,
  closedAngle,
  openAngle,
  open,
  onClick,
}: {
  x: number;
  y: number;
  length: number;
  closedAngle: number;
  openAngle: number;
  open: boolean;
  onClick: () => void;
}) {
  const angle = open ? openAngle : closedAngle;
  return (
    <g className="home-door" data-open={open} onClick={onClick}>
      <line
        x1={x}
        y1={y}
        x2={x + length}
        y2={y}
        className="home-door-leaf"
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${x}px ${y}px` }}
      />
    </g>
  );
}

function Person({ x, y }: { x: number; y: number }) {
  return (
    <g className="home-person" transform={`translate(${x} ${y})`}>
      <circle cy="-11" r="5" />
      <path d="M-8 9 Q-8 -3 0 -3 Q8 -3 8 9 Z" />
    </g>
  );
}

export function FloorPlan({ engine, realNow, selected, onSelect }: FloorPlanProps) {
  const seen = (device: DeviceId) => {
    const last = engine.lastSeen.get(device);
    return last && realNow - last.real < PULSE_MS ? last.real : null;
  };
  const recentlySeen = (device: DeviceId, ms: number) => {
    const last = engine.lastSeen.get(device);
    return Boolean(last && engine.now - last.at < ms);
  };
  const marker = (device: DeviceId, active = false) => (
    <Marker
      key={device}
      device={device}
      selected={selected === device}
      active={active}
      pulse={seen(device)}
      onSelect={onSelect}
    />
  );

  const alarm = engine.alarmActive;
  const rgb = RGB_CSS[engine.rgb];
  const [lcdTop, lcdBottom] = engine.lcdText();
  const stopwatch = (() => {
    if (engine.stopwatchRunning || engine.stopwatchBlinking) {
      const minutes = String(Math.floor(engine.stopwatchTime / 60)).padStart(2, '0');
      const seconds = String(engine.stopwatchTime % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    }
    return formatClock(engine.now, false); // idle, it shows the time
  })();
  const people = Math.min(engine.peopleCount, 6);
  const dhtLabel = (device: DhtId, x: number, y: number, anchor: 'start' | 'end') => {
    const { temperature, humidity } = engine.climate(device);
    return (
      <text className="home-reading" x={x} y={y} textAnchor={anchor}>
        <tspan x={x}>{temperature.toFixed(1)}°C</tspan>
        <tspan x={x} dy="14">
          {Math.round(humidity)}%
        </tspan>
      </text>
    );
  };

  return (
    <svg className="home-plan" viewBox="12 14 680 462" data-alarm={alarm}>
      <defs>
        <radialGradient id="home-glow">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.75" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* outside: a path to the front door, grass */}
      <rect className="home-outside" x="0" y="0" width="700" height="480" />
      <rect className="home-path" x="494" y="410" width="58" height="70" />

      {ROOMS.map((room) => (
        <g key={room.id}>
          <rect
            className="home-room"
            x={room.x}
            y={room.y}
            width={room.width}
            height={room.height}
          />
          <text className="home-room-label" x={room.x + 12} y={room.y + 20}>
            {room.label}
          </text>
        </g>
      ))}

      {/* the bedroom's RGB light colors the room */}
      {rgb && (
        <circle
          cx="128"
          cy="112"
          r="96"
          fill="url(#home-glow)"
          style={{ color: rgb }}
          className="home-rgb"
        />
      )}

      {/* outer walls, with gaps for the two doors */}
      <path className="home-wall" d="M494 410 H30 V30 H630 V100 M630 160 V410 H552" />
      <Door
        x={494}
        y={410}
        length={58}
        closedAngle={0}
        openAngle={-78}
        open={engine.doors.DS1 === 1}
        onClick={() => onSelect('DS1')}
      />
      <Door
        x={630}
        y={100}
        length={60}
        closedAngle={90}
        openAngle={160}
        open={engine.doors.DS2 === 1}
        onClick={() => onSelect('DS2')}
      />

      {/* the door light, outside the front door */}
      {engine.doorLight && (
        <circle cx="462" cy="446" r="40" fill="url(#home-glow)" style={{ color: '#ffd45c' }} />
      )}

      {/* what the distance sensors see: a person close to the door */}
      {recentlySeen('DUS1', 3000) && engine.distance(1) < 50 && <Person x={526} y={430} />}
      {recentlySeen('DUS2', 3000) && engine.distance(2) < 50 && <Person x={662} y={160} />}

      {/* the LCD in the living room */}
      <g className="home-lcd" onClick={() => onSelect('LCD')}>
        <rect x="160" y="226" width="186" height="46" rx="4" />
        <text x="170" y="245">
          {lcdTop}
        </text>
        <text x="170" y="263">
          {lcdBottom}
        </text>
      </g>

      {/* the kitchen timer's four digits */}
      <g className="home-4sd" data-blink={engine.stopwatchBlinking} onClick={() => onSelect('4SD')}>
        <rect x="428" y="62" width="92" height="34" rx="4" />
        <text x="474" y="87">
          {stopwatch}
        </text>
      </g>

      {/* the residents at home */}
      <g className="home-people">
        {Array.from({ length: people }, (_, index) => (
          <Person key={index} x={200 + index * 26} y={350} />
        ))}
        <text className="home-people-count" x="190" y="392">
          {engine.peopleCount === 0 ? 'Nobody home' : `${engine.peopleCount} at home`}
        </text>
      </g>

      {dhtLabel('DHT1', 86, 176, 'start')}
      {dhtLabel('DHT2', 356, 176, 'end')}
      {dhtLabel('DHT3', 470, 198, 'start')}

      {marker('DS1', engine.doors.DS1 === 1)}
      {marker('DPIR1', recentlySeen('DPIR1', 3000))}
      {marker('DMS', engine.pinBuffer.length > 0)}
      {marker('DB', engine.buzzer)}
      {marker('DL', engine.doorLight)}
      {marker('DUS1', recentlySeen('DUS1', 3000) && engine.distance(1) < 50)}
      {marker('WEBC')}
      {marker('DS2', engine.doors.DS2 === 1)}
      {marker('DPIR2', recentlySeen('DPIR2', 3000))}
      {marker('DUS2', recentlySeen('DUS2', 3000) && engine.distance(2) < 50)}
      {marker('4SD', engine.stopwatchRunning || engine.stopwatchBlinking)}
      {marker('BTN')}
      {marker('DHT3')}
      {marker('GSG', alarm && engine.alarmReason.includes('icon'))}
      {marker('DHT1')}
      {marker('IR')}
      {marker('BRGB', engine.rgb !== 'off')}
      {marker('DHT2')}
      {marker('LCD')}
      {marker('DPIR3', recentlySeen('DPIR3', 3000))}
    </svg>
  );
}
