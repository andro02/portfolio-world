import { TraceRecorder, decodeToken, jitter, type Trace } from './aws';
import { HANDLERS } from './lambdas';
import { getCloud } from './state';

// API Gateway (HTTP API) as serverless.yml sets it up: each route goes to one
// Lambda function, some behind a JWT authorizer that accepts only tokens of
// one Cognito user pool. A request runs right away; the promise it returns
// settles once the panel has played the request's trace, so the app waits
// about as long as it would for the real thing.

type Authorizer = 'clientAuthorizer' | 'adminAuthorizer';

interface Route {
  method: string;
  path: string;
  functionName: string;
  authorizer?: Authorizer;
}

export const ROUTES: Route[] = [
  { method: 'POST', path: '/login', functionName: 'login' },
  { method: 'POST', path: '/register', functionName: 'register' },
  { method: 'GET', path: '/downloadFilm', functionName: 'downloadFile' },
  { method: 'POST', path: '/film', functionName: 'createFilm', authorizer: 'adminAuthorizer' },
  { method: 'PUT', path: '/updateFilm', functionName: 'updateFilm', authorizer: 'adminAuthorizer' },
  {
    method: 'DELETE',
    path: '/film/filename',
    functionName: 'deleteFilm',
    authorizer: 'adminAuthorizer',
  },
  {
    method: 'POST',
    path: '/favourite',
    functionName: 'createFavourites',
    authorizer: 'clientAuthorizer',
  },
  {
    method: 'POST',
    path: '/ratings',
    functionName: 'createRatings',
    authorizer: 'clientAuthorizer',
  },
  {
    method: 'GET',
    path: '/notifications',
    functionName: 'getNotifications',
    authorizer: 'clientAuthorizer',
  },
  { method: 'GET', path: '/ratings', functionName: 'getRatings' },
  { method: 'GET', path: '/film', functionName: 'getFilms' },
  { method: 'GET', path: '/film/filtered', functionName: 'getFilteredFilms' },
  { method: 'GET', path: '/film/filename', functionName: 'getFilm', authorizer: 'adminAuthorizer' },
  {
    method: 'GET',
    path: '/favourites',
    functionName: 'getFavourites',
    authorizer: 'clientAuthorizer',
  },
  {
    method: 'DELETE',
    path: '/deleteFavourites',
    functionName: 'deleteFavourites',
    authorizer: 'clientAuthorizer',
  },
];

const MEMORY_MB = 128; // provider.memorySize

// a function's first request starts a new execution environment (a cold
// start: Python and boto3 load); later ones reuse it while it is warm
const WARM_FOR = 10 * 60 * 1000;
const lastInvoked = new Map<string, number>();

export interface Usage {
  requests: number;
  invocations: number;
  coldStarts: number;
  gbSeconds: number;
}

export const usage: Usage = { requests: 0, invocations: 0, coldStarts: 0, gbSeconds: 0 };

export interface RunningTrace extends Trace {
  startedAt: number; // performance.now()
  playMs: number; // how long the panel plays it
}

type Listener = (trace: RunningTrace) => void;
const listeners = new Set<Listener>();
export const traces: RunningTrace[] = [];
let nextId = 1;

export function onTrace(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// how long each step is shown: proportional to its duration, within limits
export const stepPlayMs = (ms: number) => Math.min(650, Math.max(160, ms * 1.4));

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

function run(
  method: string,
  path: string,
  query: Record<string, string>,
  body: unknown,
  token: string | null,
) {
  const trace = new TraceRecorder();
  const cloud = getCloud();
  const queryString = new URLSearchParams(query).toString();
  trace.step('browser', `${method} ${path}${queryString ? `?${queryString}` : ''}`, 0);
  usage.requests++;

  const route = ROUTES.find((candidate) => candidate.method === method && candidate.path === path);
  if (!route) {
    trace.step('apigw', 'No route matches → 404', jitter(6), undefined, true);
    return { trace, status: 404, body: { message: 'Not Found' } };
  }
  trace.step('apigw', `Route ${method} ${path} → ${route.functionName}`, jitter(9));

  // the JWT authorizer: a token issued by the route's user pool, for its app
  // client, and not expired
  if (route.authorizer) {
    const pool =
      route.authorizer === 'adminAuthorizer'
        ? cloud.cognito.pools.admin
        : cloud.cognito.pools.client;
    const claims = token ? decodeToken(token) : null;
    const valid =
      claims !== null &&
      claims.iss === cloud.cognito.issuer(pool) &&
      claims.client_id === pool.clientId &&
      claims.exp * 1000 > Date.now();
    if (!valid) {
      const reason = !claims
        ? 'no token'
        : claims.iss !== cloud.cognito.issuer(pool)
          ? `issuer is not ${pool.name}`
          : 'token expired';
      trace.step(
        'cognito',
        `${route.authorizer}: JWT rejected (${reason})`,
        jitter(4),
        undefined,
        true,
      );
      trace.step('apigw', '401 Unauthorized', 1, undefined, true);
      return { trace, status: 401, body: { message: 'Unauthorized' }, route };
    }
    trace.step(
      'cognito',
      `${route.authorizer}: JWT valid (${pool.name})`,
      jitter(3),
      claims.username,
    );
  }

  // the Lambda function
  const now = Date.now();
  const cold = now - (lastInvoked.get(route.functionName) ?? -Infinity) > WARM_FOR;
  lastInvoked.set(route.functionName, now);
  if (cold) {
    trace.step(
      'lambda',
      `${route.functionName}: cold start (python3.8, ${MEMORY_MB} MB)`,
      jitter(380, 0.3),
      'Init duration',
    );
  }
  const lambdaTrace = new TraceRecorder();
  let status: number;
  let responseBody: unknown;
  try {
    const result = HANDLERS[route.functionName](cloud, { query, body }, lambdaTrace);
    status = result.status;
    responseBody = result.body;
  } catch (error) {
    lambdaTrace.step('lambda', `Unhandled exception: ${String(error)}`, 2, undefined, true);
    status = 502;
    responseBody = { message: 'Internal Server Error' };
  }
  const handlerMs = 4 + lambdaTrace.steps.reduce((sum, step) => sum + step.ms, 0);
  trace.step(
    'lambda',
    `${route.functionName} handler`,
    jitter(3),
    `Duration ${Math.round(handlerMs)} ms`,
  );
  trace.steps.push(...lambdaTrace.steps);

  const billedMs = Math.ceil(handlerMs);
  usage.invocations++;
  if (cold) usage.coldStarts++;
  usage.gbSeconds += (billedMs / 1000) * (MEMORY_MB / 1024);
  trace.step(
    'lambda',
    `Return ${status}`,
    1,
    `Billed ${billedMs} ms × ${MEMORY_MB} MB`,
    status >= 400,
  );
  trace.step('apigw', `${status} → browser`, jitter(5), undefined, status >= 400);
  return { trace, status, body: responseBody, route, billedMs, cold };
}

export function request<T = unknown>(
  method: string,
  path: string,
  options: { query?: Record<string, string>; body?: unknown; token?: string | null } = {},
): Promise<ApiResponse<T>> {
  const result = run(method, path, options.query ?? {}, options.body, options.token ?? null);
  const playMs = result.trace.steps.reduce((sum, step) => sum + stepPlayMs(step.ms), 0);
  const running: RunningTrace = {
    id: nextId++,
    method,
    path,
    functionName: result.route?.functionName,
    status: result.status,
    steps: result.trace.steps,
    response: result.body,
    billedMs: result.billedMs ?? 0,
    coldStart: result.cold ?? false,
    startedAt: performance.now(),
    playMs,
  };
  traces.unshift(running);
  if (traces.length > 30) traces.pop();
  listeners.forEach((listener) => listener(running));

  return new Promise((resolve) => {
    setTimeout(() => resolve({ status: result.status, data: result.body as T }), playMs);
  });
}

export function resetApi() {
  traces.length = 0;
  lastInvoked.clear();
  Object.assign(usage, { requests: 0, invocations: 0, coldStarts: 0, gbSeconds: 0 });
}
