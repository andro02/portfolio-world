import { useEffect, useState } from 'react';
import { stepPlayMs, traces, type RunningTrace } from '../cloud/api';
import type { NodeId } from '../cloud/aws';
import { SOURCE } from '../cloud/lambdas';

// The cloud side: a diagram of the architecture in serverless.yml where the
// latest request lights up service by service, and the steps it took.

const NODES: Record<NodeId, { x: number; y: number; title: string; sub: string; color: string }> = {
  browser: { x: 52, y: 62, title: 'Browser', sub: 'Angular app', color: '#7a7f8a' },
  apigw: { x: 168, y: 62, title: 'API Gateway', sub: 'HTTP API', color: '#e7157b' },
  lambda: { x: 290, y: 62, title: 'Lambda', sub: '15 functions', color: '#ed7100' },
  cognito: { x: 168, y: 176, title: 'Cognito', sub: '2 user pools', color: '#dd344c' },
  dynamodb: { x: 410, y: 26, title: 'DynamoDB', sub: '5 tables', color: '#4053d6' },
  s3: { x: 410, y: 86, title: 'S3', sub: 'film-bucket', color: '#3f8624' },
  sns: { x: 410, y: 146, title: 'SNS', sub: 'topics', color: '#c7254e' },
  email: { x: 410, y: 206, title: 'Email', sub: 'subscribers', color: '#6b7280' },
};

const EDGES: [NodeId, NodeId][] = [
  ['browser', 'apigw'],
  ['apigw', 'lambda'],
  ['apigw', 'cognito'],
  ['lambda', 'cognito'],
  ['lambda', 'dynamodb'],
  ['lambda', 's3'],
  ['lambda', 'sns'],
  ['sns', 'email'],
];

const W = 92;
const H = 40;

// how far the trace has played: the index of the step being shown
function playedStep(trace: RunningTrace, now: number): number {
  let elapsed = now - trace.startedAt;
  for (let index = 0; index < trace.steps.length; index++) {
    elapsed -= stepPlayMs(trace.steps[index].ms);
    if (elapsed < 0) return index;
  }
  return trace.steps.length; // done
}

function Diagram({ trace, step }: { trace: RunningTrace | null; step: number }) {
  const shown = trace ? trace.steps.slice(0, Math.min(step + 1, trace.steps.length)) : [];
  const active = trace && step < trace.steps.length ? trace.steps[step].node : null;
  const visited = new Set(shown.map((item) => item.node));
  // the edge the request just crossed
  let from: NodeId | null = null;
  for (let index = Math.min(step, (trace?.steps.length ?? 1) - 1); index > 0 && trace; index--) {
    if (trace.steps[index - 1].node !== trace.steps[index].node) {
      from = trace.steps[index - 1].node;
      break;
    }
  }
  const edgeKey = (a: NodeId, b: NodeId) => [a, b].sort().join('-');
  const hot = from && active ? edgeKey(from, active) : null;
  const failed = trace && step >= trace.steps.length && trace.status >= 400;

  return (
    <svg className="mc-diagram" viewBox="0 0 462 232" role="img" aria-label="Architecture diagram">
      {EDGES.map(([a, b]) => {
        const start = NODES[a];
        const end = NODES[b];
        const key = edgeKey(a, b);
        return (
          <line
            key={key}
            className="mc-edge"
            data-hot={key === hot}
            data-visited={visited.has(a) && visited.has(b)}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        );
      })}
      {(Object.keys(NODES) as NodeId[]).map((id) => {
        const node = NODES[id];
        const sub = id === 'lambda' && trace?.functionName ? trace.functionName : node.sub;
        return (
          <g
            key={id}
            className="mc-node"
            data-active={id === active}
            data-visited={visited.has(id)}
            data-failed={Boolean(failed && id === trace?.steps[trace.steps.length - 1].node)}
            transform={`translate(${node.x - W / 2} ${node.y - H / 2})`}
          >
            <rect width={W} height={H} rx="7" />
            <rect width="5" height={H} rx="2" fill={node.color} />
            <text x="12" y="17" className="mc-node-title">
              {node.title}
            </text>
            <text x="12" y="31" className="mc-node-sub">
              {sub.length > 15 ? `${sub.slice(0, 14)}…` : sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CloudView() {
  const [trace, setTrace] = useState<RunningTrace | null>(() => traces[0] ?? null);
  const [now, setNow] = useState(0);
  const [showResponse, setShowResponse] = useState(false);

  // follow the newest request, and play it
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(performance.now());
      setTrace((current) => (traces[0] && traces[0] !== current ? traces[0] : current));
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const step = trace ? playedStep(trace, now) : 0;
  const done = trace !== null && step >= trace.steps.length;
  const totalMs = trace ? trace.steps.reduce((sum, item) => sum + item.ms, 0) : 0;

  return (
    <div className="mc-cloud">
      <Diagram trace={trace} step={step} />
      {trace ? (
        <div className="mc-trace">
          <div className="mc-trace-head">
            <code>
              {trace.method} {trace.path}
            </code>
            {done && (
              <span className="mc-status" data-ok={trace.status < 400}>
                {trace.status} · {totalMs} ms
              </span>
            )}
          </div>
          {trace.functionName && (
            <p className="mc-muted mc-source">
              cloud-back/{SOURCE[trace.functionName]}
              {trace.coldStart ? ' · cold start' : ' · warm'}
            </p>
          )}
          <ol>
            {trace.steps.slice(1, step + 1).map((item, index) => (
              <li key={index} data-node={item.node} data-error={Boolean(item.error)}>
                <span className="mc-step-text">{item.text}</span>
                <span className="mc-step-ms">{item.ms} ms</span>
                {item.detail && <span className="mc-step-detail">{item.detail}</span>}
              </li>
            ))}
          </ol>
          {done && (
            <button
              type="button"
              className="mc-link"
              onClick={() => setShowResponse(!showResponse)}
            >
              {showResponse ? 'Hide' : 'Show'} the response body
            </button>
          )}
          {done && showResponse && (
            <pre className="mc-json">{JSON.stringify(trace.response, null, 2)?.slice(0, 2400)}</pre>
          )}
        </div>
      ) : (
        <p className="mc-muted mc-trace-empty">
          Use the app: each click is a request, shown here as it goes through the services.
        </p>
      )}
    </div>
  );
}
