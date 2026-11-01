import { useEffect, useState, type FormEvent } from 'react';
import { request } from '../cloud/api';
import type { Item } from '../cloud/aws';
import type { FileInfo } from '../cloud/lambdas';
import type { Session } from '../cloud/session';
import type { Notice } from './FilmCard';
import { FilePicker } from './FilePicker';

// Uploading a film and editing one (film-create and film-update in the
// Angular app). The film's details travel in the query string and the video
// in the body. On edit without a new file, the page first downloads the
// current one and sends it back, as the original does.

const GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Horror',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Thriller',
  'Documentary',
];

interface FilmFormProps {
  session: Session;
  editing: string | null; // the film's filename, or null for a new film
  onDone: () => void;
  onNotice: (notice: Notice) => void;
}

const EMPTY = {
  name: '',
  director: '',
  genre: 'Drama',
  actors: '',
  releaseDate: '',
  description: '',
};

// for visitors without a video at hand
const SAMPLE: FileInfo = { name: 'the_lost_world.mp4', size: 468 * 1024 * 1024, type: 'video/mp4' };
const SAMPLE_FILM = {
  name: 'The Lost World',
  director: 'Harry O. Hoyt',
  genre: 'Science Fiction',
  actors: 'Wallace Beery, Bessie Love, Lewis Stone',
  releaseDate: '1925-02-02',
  description:
    'An expedition to a remote South American plateau finds dinosaurs still alive there.',
};

export function FilmForm({ session, editing, onDone, onNotice }: FilmFormProps) {
  const [fields, setFields] = useState(EMPTY);
  const [file, setFile] = useState<FileInfo | null>(null);
  const [existing, setExisting] = useState<Item | null>(null);
  const [busy, setBusy] = useState(Boolean(editing));

  // editing: the film comes from GET /film/filename (admins only)
  useEffect(() => {
    if (!editing) return;
    let active = true;
    void request<{ data: Item[] }>('GET', '/film/filename', {
      token: session.token,
      query: { filename: editing },
    }).then((response) => {
      if (!active) return;
      const film = response.data?.data?.[0];
      if (film) {
        setExisting(film);
        setFields({
          name: String(film.name),
          director: String(film.director),
          genre: String(film.genre),
          actors: String(film.actors),
          releaseDate: String(film.releaseDate),
          description: String(film.description),
        });
      }
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [editing, session.token]);

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setFields({ ...fields, [key]: value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    let upload = file;
    setBusy(true);

    if (editing && !upload && existing) {
      const download = await request('GET', '/downloadFilm', { query: { filename: editing } });
      if (download.status !== 200) {
        setBusy(false);
        onNotice({ tone: 'error', text: `Could not get the current file (${download.status}).` });
        return;
      }
      upload = { name: editing, size: Number(existing.size), type: String(existing.type) };
    }
    if (!upload) {
      setBusy(false);
      onNotice({ tone: 'error', text: 'Choose a video file (or use the sample).' });
      return;
    }

    const query = {
      filename: editing ?? upload.name,
      type: upload.type || 'application/octet-stream',
      size: String(upload.size),
      lastModifiedDate: today,
      ...fields,
      ...(editing ? {} : { userEmail: session.email }),
    };
    const response = editing
      ? await request<{ error?: string }>('PUT', '/updateFilm', {
          token: session.token,
          query,
          body: upload,
        })
      : await request<{ error?: string }>('POST', '/film', {
          token: session.token,
          query,
          body: upload,
        });
    setBusy(false);

    if (response.status === 200) {
      onNotice({
        tone: 'ok',
        text: editing ? `Updated "${fields.name}".` : `Uploaded "${fields.name}".`,
      });
      onDone();
    } else {
      onNotice({
        tone: 'error',
        text: `${response.status}: ${response.data?.error ?? 'request failed'}`,
      });
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, props: Record<string, unknown> = {}) => (
    <label className="mc-field">
      <span>{label}</span>
      <input
        value={fields[key]}
        onChange={(event) => set(key)(event.target.value)}
        required
        {...props}
      />
    </label>
  );

  return (
    <form className="mc-form" onSubmit={(event) => void submit(event)} data-busy={busy}>
      <h3>{editing ? `Edit ${editing}` : 'Upload a film'}</h3>
      {!editing && (
        <button
          type="button"
          className="mc-link"
          onClick={() => {
            setFields(SAMPLE_FILM);
            setFile(SAMPLE);
          }}
        >
          Fill in a sample film
        </button>
      )}
      <div className="mc-form-grid">
        {field('name', 'Name')}
        {field('director', 'Director')}
        <label className="mc-field">
          <span>Genre</span>
          <select value={fields.genre} onChange={(event) => set('genre')(event.target.value)}>
            {GENRES.map((genre) => (
              <option key={genre}>{genre}</option>
            ))}
          </select>
        </label>
        {field('releaseDate', 'Release date', { type: 'date' })}
        {field('actors', 'Actors (comma separated)')}
        <div className="mc-field mc-field-wide">
          <span>Video file{editing ? ' (optional: keeps the current one)' : ''}</span>
          <FilePicker file={file} onChange={setFile} />
        </div>
      </div>
      <label className="mc-field">
        <span>Description</span>
        <textarea
          value={fields.description}
          onChange={(event) => set('description')(event.target.value)}
          rows={3}
          required
        />
      </label>
      <p className="mc-hint">
        Only the file's name, size and type are used here; nothing leaves your browser. Followers of
        the director, genre or an actor get an email (see Inbox).
      </p>
      <div className="mc-form-buttons">
        <button type="submit" className="mc-primary" disabled={busy}>
          {busy ? 'Working…' : editing ? 'Save' : 'Upload'}
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
