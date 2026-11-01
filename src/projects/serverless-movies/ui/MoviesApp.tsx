import { useEffect, useState, type FormEvent } from 'react';
import { request } from '../cloud/api';
import type { Item } from '../cloud/aws';
import { SIGNED_OUT, getSession, setSession, type Session } from '../cloud/session';
import { DEMO_ADMIN, DEMO_CLIENT, DEMO_PASSWORD } from '../cloud/state';
import { FilmCard, type Notice } from './FilmCard';
import { FilmForm } from './FilmForm';

// The project's Angular app, rebuilt here: sign in (or register), the film
// list with search, uploading and editing films for admins, ratings and
// favourites for clients. Every action is a request to the simulated API.

type Screen = 'login' | 'register' | 'films' | 'upload' | 'edit' | 'favourites';

interface LoginResponse {
  body?: { AccessToken: string };
  role?: 'Admin' | 'Client';
  AccessToken?: string;
  message?: string;
}

const SEARCH_FIELDS = [
  ['name', 'Film'],
  ['director', 'Director'],
  ['genre', 'Genre'],
  ['actor', 'Actor'],
  ['description', 'Description'],
] as const;

type Search = Record<(typeof SEARCH_FIELDS)[number][0], string>;
const NO_SEARCH: Search = { name: '', director: '', genre: '', actor: '', description: '' };

function Login({
  onSignedIn,
  onRegister,
}: {
  onSignedIn: (session: Session) => void;
  onRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async (address: string, secret: string) => {
    setBusy(true);
    setError('');
    const response = await request<LoginResponse>('POST', '/login', {
      body: { email: address, password: secret },
    });
    setBusy(false);
    if (response.status === 200 && response.data.body && response.data.role) {
      onSignedIn({
        token: response.data.body.AccessToken,
        role: response.data.role,
        email: address,
      });
    } else {
      setError(response.data.message ?? `Sign-in failed (${response.status})`);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void signIn(email, password);
  };

  return (
    <div className="mc-auth" data-busy={busy}>
      <h3>Sign in</h3>
      <p className="mc-muted">Try it with a demo account:</p>
      <div className="mc-demo-accounts">
        <button type="button" onClick={() => void signIn(DEMO_CLIENT, DEMO_PASSWORD)}>
          <strong>Client</strong>
          <span>Browse, rate, download and follow genres, directors and actors</span>
          <code>{DEMO_CLIENT}</code>
        </button>
        <button type="button" onClick={() => void signIn(DEMO_ADMIN, DEMO_PASSWORD)}>
          <strong>Admin</strong>
          <span>Upload, edit and delete films; followers get an email</span>
          <code>{DEMO_ADMIN}</code>
        </button>
      </div>
      <p className="mc-hint">
        The two roles are two Cognito user pools. Or sign in with your own account:
      </p>
      <form onSubmit={submit} className="mc-form-compact">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="mc-primary">
          Sign in
        </button>
      </form>
      {error && <p className="mc-error">{error}</p>}
      <p className="mc-muted">
        No account?{' '}
        <button type="button" className="mc-link" onClick={onRegister}>
          Register
        </button>
      </p>
    </div>
  );
}

function Register({
  onSignedIn,
  onLogin,
}: {
  onSignedIn: (session: Session) => void;
  onLogin: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    surname: '',
    username: '',
    email: '',
    birthday: '2000-01-01',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await request<LoginResponse>('POST', '/register', { body: form });
    setBusy(false);
    if (response.status === 200 && response.data.AccessToken) {
      onSignedIn({ token: response.data.AccessToken, role: 'Client', email: form.email });
    } else {
      setError(response.data.message ?? `Registration failed (${response.status})`);
    }
  };

  const input = (key: keyof typeof form, placeholder: string, type = 'text') => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      required
    />
  );

  return (
    <div className="mc-auth" data-busy={busy}>
      <h3>Register</h3>
      <form onSubmit={(event) => void submit(event)} className="mc-form-compact mc-two">
        {input('name', 'Name')}
        {input('surname', 'Surname')}
        {input('username', 'Username')}
        {input('email', 'Email', 'email')}
        {input('birthday', 'Birthday', 'date')}
        {input('password', 'Password (6+)', 'password')}
        <button type="submit" className="mc-primary">
          Create account
        </button>
      </form>
      {error && <p className="mc-error">{error}</p>}
      <p className="mc-muted">
        New accounts go to the client pool.{' '}
        <button type="button" className="mc-link" onClick={onLogin}>
          Back to sign in
        </button>
      </p>
    </div>
  );
}

function Favourites({
  session,
  onNotice,
}: {
  session: Session;
  onNotice: (notice: Notice) => void;
}) {
  const [topics, setTopics] = useState<string[] | null>(null);

  const [version, setVersion] = useState(0); // a change loads the list again

  useEffect(() => {
    let active = true;
    void request<{ data: string[] }>('GET', '/favourites', {
      token: session.token,
      query: { userEmail: session.email },
    }).then((response) => {
      if (active) setTopics(response.status === 200 ? response.data.data : []);
    });
    return () => {
      active = false;
    };
  }, [session, version]);

  const remove = async (topic: string) => {
    await request('DELETE', '/deleteFavourites', {
      token: session.token,
      query: { userEmail: session.email, topicName: topic },
    });
    onNotice({ tone: 'ok', text: `No more emails about ${topic.replace(/_/g, ' ')}.` });
    setVersion((value) => value + 1);
  };

  return (
    <div className="mc-favourites">
      <h3>Favourites</h3>
      <p className="mc-hint">
        Each one is an SNS topic you are subscribed to by email; a new film with that name sends you
        a message. Only confirmed subscriptions are listed.
      </p>
      {topics === null ? (
        <p className="mc-muted">Loading…</p>
      ) : topics.length === 0 ? (
        <p className="mc-muted">None yet: open a film and click a genre, director or actor.</p>
      ) : (
        <ul>
          {topics.map((topic) => (
            <li key={topic}>
              <span>{topic.replace(/_/g, ' ')}</span>
              <button type="button" onClick={() => void remove(topic)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MoviesApp({ onInbox }: { onInbox: () => void }) {
  const [session, setCurrent] = useState<Session>(getSession);
  const [screen, setScreen] = useState<Screen>(() => (getSession().token ? 'films' : 'login'));
  const [films, setFilms] = useState<Item[] | null>(null);
  const [search, setSearch] = useState<Search>(NO_SEARCH);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [follow, setFollow] = useState<string | null>(null);

  const signIn = (next: Session) => {
    setSession(next);
    setCurrent(next);
    setNotice(null);
    setScreen('films');
  };

  const signOut = () => {
    setSession(SIGNED_OUT);
    setCurrent(SIGNED_OUT);
    setFilms(null);
    setNotice(null);
    setFollow(null);
    setScreen('login');
  };

  const [filmsVersion, setFilmsVersion] = useState(0); // a change loads the list again

  const loadFilms = () => {
    setFilms(null);
    setFilmsVersion((value) => value + 1);
  };

  useEffect(() => {
    if (screen !== 'films') return;
    let active = true;
    void request<{ data: Item[] }>('GET', '/film').then((response) => {
      if (active) setFilms(sortFilms(response.data.data ?? []));
    });
    return () => {
      active = false;
    };
  }, [screen, filmsVersion]);

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    setFilms(null);
    const response = await request<Item[]>('GET', '/film/filtered', { query: search });
    setFilms(sortFilms(response.data ?? []));
  };

  const subscribe = async (name: string) => {
    setFollow(null);
    const response = await request('POST', '/favourite', {
      token: session.token,
      body: { name, userEmail: session.email },
    });
    setNotice(
      response.status === 200
        ? { tone: 'info', text: `Subscribed to ${name}. Confirm it from the email SNS just sent.` }
        : { tone: 'error', text: `Subscribing failed (${response.status}).` },
    );
    if (response.status === 200) onInbox();
  };

  const nav = (target: Screen, label: string) => (
    <button type="button" data-current={screen === target} onClick={() => setScreen(target)}>
      {label}
    </button>
  );

  return (
    <div className="mc-app">
      <nav className="mc-nav">
        <strong className="mc-brand">MovieCloud</strong>
        {session.token ? (
          <>
            {nav('films', 'All films')}
            {session.role === 'Admin' && nav('upload', 'Upload film')}
            {session.role === 'Client' && nav('favourites', 'Favourites')}
            <span className="mc-user" title={session.email}>
              {session.email} · {session.role}
            </span>
            <button type="button" onClick={signOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            {nav('login', 'Sign in')}
            {nav('register', 'Register')}
          </>
        )}
      </nav>

      {notice && (
        <div className="mc-notice" data-tone={notice.tone}>
          <span>
            {notice.text}{' '}
            {notice.link && (
              <a href={notice.link.href} target="_blank" rel="noreferrer">
                {notice.link.label}
              </a>
            )}
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Close">
            ×
          </button>
        </div>
      )}

      {follow && (
        <div className="mc-notice" data-tone="info">
          <span>Get an email whenever a film with {follow} is uploaded?</span>
          <span className="mc-notice-buttons">
            <button type="button" className="mc-primary" onClick={() => void subscribe(follow)}>
              Follow
            </button>
            <button type="button" onClick={() => setFollow(null)}>
              Cancel
            </button>
          </span>
        </div>
      )}

      <div className="mc-screen">
        {screen === 'login' && (
          <Login onSignedIn={signIn} onRegister={() => setScreen('register')} />
        )}
        {screen === 'register' && (
          <Register onSignedIn={signIn} onLogin={() => setScreen('login')} />
        )}
        {screen === 'favourites' && <Favourites session={session} onNotice={setNotice} />}
        {(screen === 'upload' || screen === 'edit') && (
          <FilmForm
            key={editing ?? 'new'}
            session={session}
            editing={screen === 'edit' ? editing : null}
            onDone={() => setScreen('films')}
            onNotice={setNotice}
          />
        )}
        {screen === 'films' && (
          <>
            <form className="mc-search" onSubmit={(event) => void runSearch(event)}>
              {SEARCH_FIELDS.map(([key, label]) => (
                <input
                  key={key}
                  placeholder={label}
                  value={search[key]}
                  onChange={(event) => setSearch({ ...search, [key]: event.target.value })}
                  aria-label={label}
                />
              ))}
              <div className="mc-search-buttons">
                <button type="submit" className="mc-primary">
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearch(NO_SEARCH);
                    loadFilms();
                  }}
                >
                  All
                </button>
              </div>
            </form>
            <p className="mc-hint">
              Search runs one DynamoDB Query per field on that field's index, so values match
              exactly: try director <em>Buster Keaton</em>, genre <em>Horror</em> or both.
            </p>
            {films === null ? (
              <p className="mc-muted">Loading…</p>
            ) : films.length === 0 ? (
              <p className="mc-muted">No films found.</p>
            ) : (
              <div className="mc-films">
                {films.map((film) => (
                  <FilmCard
                    key={String(film.filename)}
                    film={film}
                    session={session}
                    onEdit={(filename) => {
                      setEditing(filename);
                      setScreen('edit');
                    }}
                    onDeleted={loadFilms}
                    onFollow={setFollow}
                    onNotice={setNotice}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// a Scan comes back in no particular order; newest releases first reads best
function sortFilms(films: Item[]): Item[] {
  return [...films].sort((a, b) => String(b.releaseDate).localeCompare(String(a.releaseDate)));
}
