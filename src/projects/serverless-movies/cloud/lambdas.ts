import { formatSize, type Item, type TraceRecorder } from './aws';
import type { CloudState } from './state';

// The project's Lambda functions (cloud-back/*/ *.py) ported to TypeScript,
// one handler per function, with the same steps against the same services.
// A handler gets the request (query string, body) and returns a status and a
// body, like the Python ones return an API Gateway response.

export interface LambdaEvent {
  query: Record<string, string>;
  body: unknown;
}

export interface LambdaResult {
  status: number;
  body: unknown;
}

// a video file chosen in the browser: only its name, size and type travel in
// the simulation (the real app sends it base64-encoded in the request body)
export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export type Handler = (cloud: CloudState, event: LambdaEvent, trace: TraceRecorder) => LambdaResult;

const ok = (body: unknown): LambdaResult => ({ status: 200, body });
const json = <T>(event: LambdaEvent) => (event.body ?? {}) as T;

// mimetypes.guess_type, for the extensions a video might have
const VIDEO_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  webm: 'video/webm',
  mpeg: 'video/mpeg',
  m4v: 'video/x-m4v',
};
const isVideo = (filename: string) =>
  Boolean(VIDEO_TYPES[filename.split('.').pop()?.toLowerCase() ?? '']);

const login: Handler = ({ cognito }, event, trace) => {
  const { email, password } = json<{ email: string; password: string }>(event);
  // the client pool first; the admin pool only if the user isn't there
  const client = cognito.initiateAuth(trace, cognito.pools.client, email, password);
  if (client.result) return ok({ body: client.result, role: 'Client' });
  if (client.error === 'NotAuthorizedException') {
    return { status: 400, body: { message: 'Incorrect username or password.' } };
  }
  const admin = cognito.initiateAuth(trace, cognito.pools.admin, email, password);
  if (admin.result) return ok({ body: admin.result, role: 'Admin' });
  if (admin.error === 'NotAuthorizedException') {
    return { status: 400, body: { message: 'Incorrect username or password.' } };
  }
  return { status: 404, body: { message: 'User not found' } };
};

const register: Handler = ({ cognito }, event, trace) => {
  const body = json<{
    name: string;
    surname: string;
    username: string;
    email: string;
    birthday: string;
    password: string;
  }>(event);
  const { client, admin } = cognito.pools;

  const sameEmail = (pool: typeof client) =>
    cognito
      .listUsers(trace, pool, `email = "${body.email}"`)
      .some((user) => user.email === body.email);
  if (sameEmail(client) || sameEmail(admin)) {
    return { status: 400, body: { message: 'User with that email already exists' } };
  }
  for (const pool of [client, admin]) {
    if (cognito.listUsers(trace, pool).some((user) => user.nickname === body.username)) {
      return { status: 400, body: { message: 'User with that username already exists' } };
    }
  }
  if (body.password.length < 6) {
    trace.step(
      'cognito',
      'AdminSetUserPassword → InvalidPasswordException',
      30,
      'MinimumLength: 6',
      true,
    );
    return { status: 400, body: { message: 'Password must be at least 6 characters' } };
  }

  cognito.createUser(trace, client, {
    email: body.email,
    password: body.password,
    givenName: body.name,
    familyName: body.surname,
    nickname: body.username,
    birthdate: body.birthday,
  });
  const auth = cognito.initiateAuth(trace, client, body.email, body.password);
  return ok(auth.result);
};

const getFilms: Handler = ({ dynamodb }, _event, trace) =>
  ok({ data: dynamodb.scan(trace, 'films-table') });

// one Query per filled-in field, on that field's index, and only the films
// found by all of them (an exact match on each index key)
const getFilteredFilms: Handler = ({ dynamodb }, event, trace) => {
  const fields: [string, string][] = [
    ['actor', 'actors-index'],
    ['description', 'description-index'],
    ['director', 'director-index'],
    ['genre', 'genre-index'],
    ['name', 'name-index'],
  ];
  const results: Item[][] = [];
  for (const [field, index] of fields) {
    const value = event.query[field];
    if (value && value.trim()) results.push(dynamodb.query(trace, 'films-table', index, value));
  }
  if (results.length === 0) return ok(dynamodb.scan(trace, 'films-table'));
  const [first, ...rest] = results;
  const found = first.filter((film) =>
    rest.every((set) => set.some((other) => other.filename === film.filename)),
  );
  return ok(found);
};

const getFilm: Handler = ({ dynamodb }, event, trace) =>
  ok({ data: dynamodb.query(trace, 'films-table', null, event.query.filename) });

const filmItem = (query: Record<string, string>): Item => ({
  filename: query.filename,
  type: query.type,
  size: query.size,
  lastModifiedDate: query.lastModifiedDate,
  creationDate: query.lastModifiedDate,
  name: query.name,
  description: query.description,
  director: query.director,
  genre: query.genre,
  actors: query.actors,
  releaseDate: query.releaseDate,
});

const createFilm: Handler = ({ dynamodb, s3, sns }, event, trace) => {
  const { query } = event;
  dynamodb.put(trace, 'films-table', filmItem(query));

  // everyone following one of its actors, genres or its director hears of it:
  // a topic per name, and its subscribers get an email
  const names = new Set([
    ...query.actors.split(',').map((actor) => actor.trim()),
    ...query.genre.split(',').map((genre) => genre.trim()),
    query.director,
  ]);
  const topics = sns.listTopics(trace).filter((topic) => names.has(topic.replace(/_/g, ' ')));
  for (const topic of topics) {
    sns.publish(
      trace,
      topic,
      'New Movie Uploaded',
      `New ${topic.replace(/_/g, ' ')} movie named ${query.name}!`,
    );
  }

  const file = event.body as FileInfo;
  if (!isVideo(query.filename)) {
    return { status: 400, body: { error: 'The uploaded file is not a video' } };
  }
  s3.put(trace, {
    key: query.filename,
    size: file.size,
    type: file.type,
    lastModified: query.lastModifiedDate,
  });
  return ok({ message: 'Successfully created film' });
};

const updateFilm: Handler = ({ dynamodb, s3 }, event, trace) => {
  const { query } = event;
  dynamodb.put(trace, 'films-table', filmItem(query));
  const file = event.body as FileInfo;
  if (!isVideo(query.filename)) {
    return { status: 400, body: { error: 'The uploaded file is not a video' } };
  }
  s3.put(trace, {
    key: query.filename,
    size: file.size,
    type: file.type,
    lastModified: query.lastModifiedDate,
  });
  return ok({ message: 'Successfully updated film' });
};

const deleteFilm: Handler = ({ dynamodb, s3 }, event, trace) => {
  dynamodb.delete(trace, 'films-table', event.query.filename);
  s3.delete(trace, event.query.filename);
  return ok({ message: 'Successfully deleted film' });
};

const downloadFile: Handler = ({ s3 }, event, trace) => {
  const object = s3.get(trace, event.query.filename);
  if (!object) return { status: 500, body: { message: 'Internal Server Error' } };
  return ok({
    filename: object.key,
    contentType: object.type,
    size: formatSize(object.size),
    note: 'base64-encoded file in the response body',
  });
};

const createRatings: Handler = ({ dynamodb }, event, trace) => {
  const body = json<{ userEmail: string; filename: string; rating: string }>(event);
  const id = dynamodb.nextId(trace, 'counter-table', 'ratings-table');
  dynamodb.put(trace, 'ratings-table', {
    id,
    userEmail: body.userEmail,
    filename: body.filename,
    rating: String(body.rating),
  });
  return ok({ message: 'Successfully created rating' });
};

const getRatings: Handler = ({ dynamodb }, event, trace) =>
  ok({ data: dynamodb.scan(trace, 'ratings-table', ['filename', event.query.filename]) });

// a favourite is a subscription to an SNS topic named after the actor, genre
// or director (spaces become underscores)
const createFavourites: Handler = ({ sns }, event, trace) => {
  const body = json<{ name: string; userEmail: string }>(event);
  const topic = body.name.replace(/ /g, '_');
  if (!sns.listTopics(trace).includes(topic)) sns.createTopic(trace, topic);
  sns.subscribe(trace, topic, body.userEmail);
  return ok({ message: 'Successfully added to favourites' });
};

// only confirmed subscriptions count
const getFavourites: Handler = ({ sns }, event, trace) => {
  const topics = sns
    .listSubscriptions(trace)
    .filter((sub) => sub.endpoint === event.query.userEmail && sub.confirmed)
    .map((sub) => sub.topic);
  return ok({ data: topics });
};

const deleteFavourites: Handler = ({ sns }, event, trace) => {
  const { userEmail, topicName } = event.query;
  if (!sns.listTopics(trace).includes(topicName)) return ok(null);
  const subscription = sns
    .listSubscriptions(trace)
    .find((sub) => sub.topic === topicName && sub.endpoint === userEmail);
  if (subscription) sns.unsubscribe(trace, subscription.arn);
  return ok(null);
};

const getNotifications: Handler = ({ dynamodb }, event, trace) =>
  ok({ data: dynamodb.scan(trace, 'notifications-table', ['userEmail', event.query.userEmail]) });

export const HANDLERS: Record<string, Handler> = {
  login,
  register,
  getFilms,
  getFilteredFilms,
  getFilm,
  createFilm,
  updateFilm,
  deleteFilm,
  downloadFile,
  createRatings,
  getRatings,
  createFavourites,
  getFavourites,
  deleteFavourites,
  getNotifications,
};

// the Python source file of each function, shown with the trace
export const SOURCE: Record<string, string> = {
  login: 'login/login.py',
  register: 'register/register.py',
  getFilms: 'getFilms/get_films.py',
  getFilteredFilms: 'getFilteredFilms/get_filtered_films.py',
  getFilm: 'getFilm/get_film.py',
  createFilm: 'createFilms/create_films.py',
  updateFilm: 'updateFilm/update_film.py',
  deleteFilm: 'deleteFilm/delete_film.py',
  downloadFile: 'downloadFile/download_file.py',
  createRatings: 'createRatings/create_ratings.py',
  getRatings: 'getRatings/get_ratings.py',
  createFavourites: 'createFavourites/create_favourites.py',
  getFavourites: 'getFavourites/get_favourites.py',
  deleteFavourites: 'deleteFavourites/delete_favourites.py',
  getNotifications: 'getNotifications/get_notifications.py',
};
