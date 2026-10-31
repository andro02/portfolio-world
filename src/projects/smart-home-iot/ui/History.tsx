import { useMemo } from 'react';
import { DEVICES, type DhtId } from '../sim/devices';
import type { HomeEngine, HistoryPoint, Security } from '../sim/engine';
import { readClimate } from '../sim/sensors';
import { HOUR, MINUTE, startOfDay, startOfNextDay } from '../sim/time';

// What Grafana showed in the project: today at a glance (who was home, when
// the alarm was armed or went off) and the last 24 hours of temperature and
// humidity in each room.

// about the width it is shown at, so the text keeps its size
const WIDTH = 360;
const SERIES: { device: DhtId; color: string }[] = [
  { device: 'DHT1', color: '#8a63d2' },
  { device: 'DHT2', color: '#3b82c4' },
  { device: 'DHT3', color: '#e07b39' },
];

const SECURITY_LABEL: Record<Security, string> = {
  disarmed: 'Off',
  arming: 'Arming',
  armed: 'Armed',
  alarm: 'Alarm',
};

function DayStrip({ engine }: { engine: HomeEngine }) {
  const dayStart = startOfDay(engine.now);
  const dayEnd = startOfNextDay(dayStart);
  const x = (ms: number) => ((ms - dayStart) / (dayEnd - dayStart)) * WIDTH;

  // the history as segments from each change to the next (or to now)
  const points = engine.history;
  const segments: (HistoryPoint & { to: number })[] = [];
  points.forEach((point, index) => {
    const to = index + 1 < points.length ? points[index + 1].at : engine.now;
    if (to <= dayStart) return;
    segments.push({ ...point, at: Math.max(point.at, dayStart), to });
  });

  const PEOPLE_TOP = 22;
  const PEOPLE_HEIGHT = 40;
  const y = (people: number) =>
    PEOPLE_TOP + PEOPLE_HEIGHT - (Math.min(people, 3) / 3) * PEOPLE_HEIGHT;

  return (
    <figure className="home-chart">
      <figcaption>
        Today <span className="home-muted">· people at home and the alarm</span>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} 100`} className="home-strip">
        {segments.map((segment) => (
          <rect
            key={`s${segment.at}`}
            className="home-strip-security"
            data-security={segment.security}
            x={x(segment.at)}
            y="70"
            width={Math.max(0.5, x(segment.to) - x(segment.at))}
            height="12"
          >
            <title>{SECURITY_LABEL[segment.security]}</title>
          </rect>
        ))}
        {segments.map((segment) => (
          <rect
            key={`p${segment.at}`}
            className="home-strip-people"
            x={x(segment.at)}
            y={y(segment.people)}
            width={Math.max(0.5, x(segment.to) - x(segment.at))}
            height={PEOPLE_TOP + PEOPLE_HEIGHT - y(segment.people)}
          />
        ))}
        <line className="home-strip-now" x1={x(engine.now)} x2={x(engine.now)} y1="14" y2="86" />
        {[0, 6, 12, 18, 24].map((hour) => (
          <text
            key={hour}
            className="home-axis"
            x={(hour / 24) * WIDTH}
            y="97"
            textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}
          >
            {String(hour).padStart(2, '0')}:00
          </text>
        ))}
        <text className="home-axis" x="0" y="10">
          People
        </text>
        <text className="home-axis" x={WIDTH} y="10" textAnchor="end">
          <tspan className="home-key-armed">■</tspan> armed{' '}
          <tspan className="home-key-alarm">■</tspan> alarm
        </text>
      </svg>
    </figure>
  );
}

function LineChart({
  title,
  unit,
  values,
  from,
}: {
  title: string;
  unit: string;
  values: Record<DhtId, number[]>;
  from: number;
}) {
  const all = Object.values(values).flat();
  const min = Math.floor(Math.min(...all) - 0.5);
  const max = Math.ceil(Math.max(...all) + 0.5);
  const HEIGHT = 120;
  const TOP = 8;
  const BOTTOM = 104;
  const LEFT = 30;
  const count = values.DHT1.length;
  const px = (index: number) => LEFT + (index / (count - 1)) * (WIDTH - LEFT);
  const py = (value: number) => BOTTOM - ((value - min) / (max - min)) * (BOTTOM - TOP);
  const hourMarks = [0, 6, 12, 18, 24].map((hours) => from + hours * HOUR);

  return (
    <figure className="home-chart">
      <figcaption>
        {title} <span className="home-muted">· last 24 hours</span>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {[min, (min + max) / 2, max].map((value) => (
          <g key={value}>
            <line className="home-grid" x1={LEFT} x2={WIDTH} y1={py(value)} y2={py(value)} />
            <text className="home-axis" x={LEFT - 4} y={py(value) + 3} textAnchor="end">
              {Math.round(value)}
              {unit}
            </text>
          </g>
        ))}
        {SERIES.map(({ device, color }) => (
          <polyline
            key={device}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            points={values[device]
              .map((value, index) => `${px(index).toFixed(1)},${py(value).toFixed(1)}`)
              .join(' ')}
          />
        ))}
        {hourMarks.map((ms, index) => (
          <text
            key={ms}
            className="home-axis"
            x={LEFT + (index / 4) * (WIDTH - LEFT)}
            y={HEIGHT - 2}
            textAnchor={index === 0 ? 'start' : index === 4 ? 'end' : 'middle'}
          >
            {index === 4 ? 'now' : new Date(ms).toTimeString().slice(0, 5)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export function History({ engine }: { engine: HomeEngine }) {
  // recomputed once per simulated 10 minutes
  const bucket = Math.floor(engine.now / (10 * MINUTE));
  const charts = useMemo(() => {
    const to = (bucket + 1) * 10 * MINUTE;
    const from = to - 24 * HOUR;
    const temperature = {} as Record<DhtId, number[]>;
    const humidity = {} as Record<DhtId, number[]>;
    for (const { device } of SERIES) {
      temperature[device] = [];
      humidity[device] = [];
      for (let ms = from; ms <= to; ms += 15 * MINUTE) {
        const reading = readClimate(device, ms);
        temperature[device].push(reading.temperature);
        humidity[device].push(reading.humidity);
      }
    }
    return { from, temperature, humidity };
  }, [bucket]);

  return (
    <div className="home-history">
      <DayStrip engine={engine} />
      <div className="home-legend">
        {SERIES.map(({ device, color }) => (
          <span key={device}>
            <i style={{ background: color }} />
            {DEVICES[device].name.replace(' DHT', '')}
          </span>
        ))}
      </div>
      <LineChart title="Temperature" unit="°" values={charts.temperature} from={charts.from} />
      <LineChart title="Humidity" unit="%" values={charts.humidity} from={charts.from} />
    </div>
  );
}
