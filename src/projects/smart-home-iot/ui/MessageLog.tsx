import { useState } from 'react';
import type { HomeEngine, LogEntry } from '../sim/engine';
import { formatClock } from '../sim/time';

// The traffic of the system, newest first: what the Pis publish over MQTT,
// the server's commands back to them, dashboard requests, and the server's
// own decisions, with a line of story for what the residents are doing.

const SOURCE_LABEL: Record<LogEntry['source'], string> = {
  PI1: 'Pi 1',
  PI2: 'Pi 2',
  PI3: 'Pi 3',
  server: 'Server',
  web: 'Web',
  story: '',
};

const isClimate = (entry: LogEntry) =>
  entry.kind === 'sensor' &&
  (entry.text.includes('"Temperature"') || entry.text.includes('"Humidity"'));

export function MessageLog({ engine }: { engine: HomeEngine }) {
  const [showClimate, setShowClimate] = useState(false);
  const entries = engine.log
    .filter((entry) => showClimate || !isClimate(entry))
    .slice(-60)
    .reverse();

  return (
    <div className="home-log">
      <div className="home-log-head">
        <span className="home-muted">
          {engine.pointsToday.toLocaleString('en')} points today for InfluxDB (simulated)
        </span>
        <label>
          <input
            type="checkbox"
            checked={showClimate}
            onChange={(event) => setShowClimate(event.target.checked)}
          />
          Temperature readings
        </label>
      </div>
      <ol className="home-log-list">
        {entries.map((entry) =>
          entry.kind === 'story' ? (
            <li key={entry.id} className="home-log-story">
              <time>{formatClock(entry.at)}</time>
              <span>{entry.text}</span>
            </li>
          ) : (
            <li key={entry.id} data-kind={entry.kind} data-source={entry.source}>
              <time>{formatClock(entry.at)}</time>
              <span className="home-log-source">{SOURCE_LABEL[entry.source]}</span>
              <span className="home-log-body">
                {entry.topic && <span className="home-log-topic">{entry.topic}</span>}
                <span className="home-log-text">{entry.text}</span>
              </span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
