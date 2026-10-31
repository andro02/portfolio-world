// Vercel Function at /api/demo-status?project=<slug>: tells the portfolio
// whether a project's live demo is answering, before its panel shows it.
//
// The check runs here, on Vercel, and not in the visitor's browser: a browser
// may not read the response of a request to another site (the demo servers
// would have to allow it with CORS headers), so it couldn't tell a working
// server from an error page. From a server there is no such limit.
//
// Every check asks the demo's backend for something tiny (one lookup by
// primary key), so it also notices a backend that is still starting up or
// not running, while its web page alone would still load.

// project slug -> URL to check; only these, so the function can't be used to
// make requests to arbitrary addresses
const CHECKS = {
  'landfill-detection': 'https://158-180-234-106.sslip.io/api/landfills/0',
  'fleet-monitoring':
    'https://89-168-28-126.sslip.io/api/users/check-username?username=portfolio-status-check',
};

// longer than this and the server is considered busy (it still works, slowly)
const TIMEOUT = 8000; // milliseconds

/** @param {Request} request */
export async function GET(request) {
  const project = new URL(request.url).searchParams.get('project') ?? '';
  const target = Object.hasOwn(CHECKS, project) ? CHECKS[project] : undefined;
  if (!target) {
    return Response.json({ error: 'unknown project' }, { status: 404 });
  }

  const started = Date.now();
  let state;
  try {
    const response = await fetch(target, {
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'manual',
    });
    // 502-504 come from Caddy when the backend behind it isn't answering;
    // any other answer (even 401 or 404) comes from a running backend
    state = response.status >= 502 && response.status <= 504 ? 'down' : 'up';
  } catch (error) {
    // no answer in time, or no connection to the server at all
    state = error instanceof Error && error.name === 'TimeoutError' ? 'slow' : 'offline';
  }

  return Response.json(
    { state, ms: Date.now() - started },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
