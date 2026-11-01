import { useState } from 'react';
import { request } from '../cloud/api';
import { formatSize, type Item } from '../cloud/aws';
import type { Session } from '../cloud/session';

// One film in the list, like film-view.component in the Angular app: the
// basics, and on "More" its details and ratings. Clients can rate it,
// download it and follow its genre, director or actors; admins can edit and
// delete it.

interface FilmCardProps {
  film: Item;
  session: Session;
  onEdit: (filename: string) => void;
  onDeleted: () => void;
  onFollow: (name: string) => void;
  onNotice: (notice: Notice) => void;
}

export interface Notice {
  tone: 'ok' | 'error' | 'info';
  text: string;
  link?: { href: string; label: string };
}

interface Rating {
  id: number;
  userEmail: string;
  rating: string;
}

const split = (value: string | number | undefined) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

function Stars({ value, onPick }: { value: number; onPick?: (value: number) => void }) {
  return (
    <span className="mc-stars" data-interactive={Boolean(onPick)}>
      {[1, 2, 3, 4, 5].map((star) =>
        onPick ? (
          <button
            key={star}
            type="button"
            data-on={star <= value}
            onClick={() => onPick(star)}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ) : (
          <span key={star} data-on={star <= value}>
            ★
          </span>
        ),
      )}
    </span>
  );
}

export function FilmCard({ film, session, onEdit, onDeleted, onFollow, onNotice }: FilmCardProps) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const [rating, setRating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filename = String(film.filename);
  const year = String(film.releaseDate ?? '').slice(0, 4);
  const isClient = session.role === 'Client';
  const isAdmin = session.role === 'Admin';

  const loadRatings = async () => {
    const response = await request<{ data: Rating[] }>('GET', '/ratings', { query: { filename } });
    setRatings(response.data.data.sort((a, b) => a.id - b.id));
  };

  const toggle = () => {
    setOpen(!open);
    if (!open && ratings === null) void loadRatings();
  };

  const rate = async (stars: number) => {
    setRating(false);
    setBusy(true);
    const response = await request('POST', '/ratings', {
      token: session.token,
      body: { userEmail: session.email, filename, rating: String(stars) },
    });
    setBusy(false);
    if (response.status === 200) {
      onNotice({ tone: 'ok', text: `Rated "${film.name}" with ${stars} stars.` });
      if (open || ratings) void loadRatings();
    } else {
      onNotice({ tone: 'error', text: `Rating failed (${response.status}).` });
    }
  };

  const download = async () => {
    setBusy(true);
    const response = await request<{ size: string }>('GET', '/downloadFilm', {
      query: { filename },
    });
    setBusy(false);
    if (response.status !== 200) {
      onNotice({ tone: 'error', text: `Download failed (${response.status}).` });
      return;
    }
    onNotice({
      tone: 'info',
      text: `${filename} (${response.data.size}) came back from S3 through the Lambda. No video files are stored in this simulation; the film is in the public domain.`,
      link: {
        href: `https://archive.org/search?query=${encodeURIComponent(`${film.name} ${year}`)}`,
        label: 'Find it on the Internet Archive',
      },
    });
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    const response = await request('DELETE', '/film/filename', {
      token: session.token,
      query: { filename },
      body: {},
    });
    setBusy(false);
    if (response.status === 200) {
      onNotice({ tone: 'ok', text: `Deleted "${film.name}".` });
      onDeleted();
    } else {
      onNotice({ tone: 'error', text: `Delete failed (${response.status}).` });
    }
  };

  // names a client can follow, as links
  const followable = (name: string) =>
    isClient ? (
      <button
        key={name}
        type="button"
        className="mc-link"
        onClick={() => onFollow(name)}
        title={`Follow ${name}`}
      >
        {name}
      </button>
    ) : (
      <span key={name}>{name}</span>
    );
  const list = (names: string[]) =>
    names.flatMap((name, index) => (index === 0 ? [followable(name)] : [', ', followable(name)]));

  const average =
    ratings && ratings.length > 0
      ? ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length
      : null;

  return (
    <article className="mc-film" data-busy={busy}>
      <div className="mc-film-head">
        <div className="mc-poster" data-genre={split(film.genre)[0]} aria-hidden="true">
          {String(film.name).slice(0, 1)}
        </div>
        <div className="mc-film-title">
          <h4>
            {String(film.name)} <span className="mc-muted">({year})</span>
          </h4>
          <p className="mc-muted">
            {list(split(film.genre))} · {followable(String(film.director))}
          </p>
        </div>
        <div className="mc-film-actions">
          {isClient && (
            <>
              <button type="button" onClick={() => setRating(!rating)}>
                Rate
              </button>
              <button
                type="button"
                onClick={() => void download()}
                aria-label="Download"
                title="Download"
              >
                ⤓
              </button>
            </>
          )}
          {isAdmin && (
            <>
              <button type="button" onClick={() => onEdit(filename)}>
                Edit
              </button>
              <button
                type="button"
                className="mc-danger"
                onClick={() => setConfirmDelete(!confirmDelete)}
              >
                Delete
              </button>
            </>
          )}
          <button type="button" className="mc-more" onClick={toggle} aria-expanded={open}>
            {open ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mc-rate">
          Delete "{String(film.name)}" from DynamoDB and S3?{' '}
          <button type="button" className="mc-danger" onClick={() => void remove()}>
            Delete
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      )}

      {rating && (
        <div className="mc-rate">
          Your rating: <Stars value={0} onPick={(stars) => void rate(stars)} />
        </div>
      )}

      {open && (
        <div className="mc-film-body">
          <p>{String(film.description)}</p>
          <dl className="mc-facts">
            <dt>Actors</dt>
            <dd>{list(split(film.actors))}</dd>
            <dt>Released</dt>
            <dd>{String(film.releaseDate)}</dd>
            <dt>File</dt>
            <dd>
              <code>{filename}</code> · {String(film.type)} · {formatSize(Number(film.size))} ·
              updated {String(film.lastModifiedDate)}
            </dd>
            <dt>Ratings</dt>
            <dd>
              {ratings === null
                ? 'Loading…'
                : ratings.length === 0
                  ? 'None yet'
                  : `${average!.toFixed(1)} from ${ratings.length}`}
            </dd>
          </dl>
          {ratings && ratings.length > 0 && (
            <ul className="mc-ratings">
              {ratings.map((item) => (
                <li key={item.id}>
                  <span>{item.userEmail}</span>
                  <Stars value={Number(item.rating)} />
                </li>
              ))}
            </ul>
          )}
          {isClient && <p className="mc-hint">Click a genre, director or actor to follow it.</p>}
        </div>
      )}
    </article>
  );
}
