import { Cognito, DynamoDb, S3, Sns, TraceRecorder } from './aws';

// The simulated account as the visitor finds it: the tables and pools from
// serverless.yml, a catalog of public-domain classics, a few ratings, and the
// demo accounts. It lives in this browser tab only; "Reset" starts over.

export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ADMIN = 'admin@moviecloud.demo';
export const DEMO_CLIENT = 'client@moviecloud.demo';

interface SeedFilm {
  filename: string;
  name: string;
  director: string;
  genre: string;
  actors: string;
  releaseDate: string;
  description: string;
  sizeMb: number;
}

// films old enough to be in the public domain
const FILMS: SeedFilm[] = [
  {
    filename: 'the_general.mp4',
    name: 'The General',
    director: 'Buster Keaton',
    genre: 'Comedy',
    actors: 'Buster Keaton, Marion Mack',
    releaseDate: '1926-12-31',
    description:
      'A Confederate train engineer chases a stolen locomotive across enemy lines to win back his engine and his girl.',
    sizeMb: 612,
  },
  {
    filename: 'sherlock_jr.mp4',
    name: 'Sherlock Jr.',
    director: 'Buster Keaton',
    genre: 'Comedy',
    actors: 'Buster Keaton, Kathryn McGuire',
    releaseDate: '1924-04-21',
    description:
      'A film projectionist who dreams of being a detective falls asleep and walks right into the movie on the screen.',
    sizeMb: 318,
  },
  {
    filename: 'nosferatu.mp4',
    name: 'Nosferatu',
    director: 'F. W. Murnau',
    genre: 'Horror',
    actors: 'Max Schreck, Gustav von Wangenheim, Greta Schröder',
    releaseDate: '1922-03-04',
    description:
      'An estate agent travels to the castle of Count Orlok, who follows him home and brings the plague with him.',
    sizeMb: 540,
  },
  {
    filename: 'metropolis.mp4',
    name: 'Metropolis',
    director: 'Fritz Lang',
    genre: 'Science Fiction',
    actors: 'Brigitte Helm, Gustav Fröhlich, Alfred Abel',
    releaseDate: '1927-01-10',
    description:
      'In a city of towering skyscrapers, the son of its ruler discovers the workers toiling beneath it.',
    sizeMb: 1180,
  },
  {
    filename: 'a_trip_to_the_moon.mp4',
    name: 'A Trip to the Moon',
    director: 'Georges Méliès',
    genre: 'Science Fiction',
    actors: 'Georges Méliès, Bleuette Bernon',
    releaseDate: '1902-09-01',
    description:
      'Astronomers fire a capsule from a giant cannon and land it in the eye of the Moon.',
    sizeMb: 46,
  },
  {
    filename: 'the_kid.mp4',
    name: 'The Kid',
    director: 'Charlie Chaplin',
    genre: 'Comedy',
    actors: 'Charlie Chaplin, Jackie Coogan, Edna Purviance',
    releaseDate: '1921-02-06',
    description:
      'The Tramp takes in an abandoned baby and raises him on the streets, until the authorities step in.',
    sizeMb: 290,
  },
  {
    filename: 'safety_last.mp4',
    name: 'Safety Last!',
    director: 'Fred C. Newmeyer',
    genre: 'Comedy',
    actors: 'Harold Lloyd, Mildred Davis',
    releaseDate: '1923-04-01',
    description:
      'A store clerk ends up climbing the outside of a department store building, floor by floor.',
    sizeMb: 402,
  },
  {
    filename: 'phantom_of_the_opera.mp4',
    name: 'The Phantom of the Opera',
    director: 'Rupert Julian',
    genre: 'Horror',
    actors: 'Lon Chaney, Mary Philbin',
    releaseDate: '1925-09-06',
    description:
      'A masked figure haunting the Paris Opera House takes a young soprano under his wing.',
    sizeMb: 580,
  },
  {
    filename: 'night_of_the_living_dead.mp4',
    name: 'Night of the Living Dead',
    director: 'George A. Romero',
    genre: 'Horror',
    actors: "Duane Jones, Judith O'Dea",
    releaseDate: '1968-10-01',
    description: 'Strangers barricade themselves in a farmhouse as the dead rise and surround it.',
    sizeMb: 720,
  },
  {
    filename: 'his_girl_friday.mp4',
    name: 'His Girl Friday',
    director: 'Howard Hawks',
    genre: 'Comedy',
    actors: 'Cary Grant, Rosalind Russell',
    releaseDate: '1940-01-18',
    description:
      'A newspaper editor uses every trick he knows to keep his ex-wife, his best reporter, from remarrying.',
    sizeMb: 690,
  },
  {
    filename: 'charade.mp4',
    name: 'Charade',
    director: 'Stanley Donen',
    genre: 'Thriller',
    actors: 'Cary Grant, Audrey Hepburn',
    releaseDate: '1963-12-05',
    description:
      "After her husband's murder, a woman in Paris is pursued by men after the fortune he stole, helped by a charming stranger.",
    sizeMb: 860,
  },
  {
    filename: 'detour.mp4',
    name: 'Detour',
    director: 'Edgar G. Ulmer',
    genre: 'Thriller',
    actors: 'Tom Neal, Ann Savage',
    releaseDate: '1945-11-30',
    description:
      'A hitchhiking pianist is drawn into a nightmare after the driver who picked him up dies.',
    sizeMb: 410,
  },
];

const RATERS = ['mila@example.com', 'luka@example.com', 'ana@example.com'];

export interface CloudState {
  cognito: Cognito;
  dynamodb: DynamoDb;
  s3: S3;
  sns: Sns;
}

function createState(): CloudState {
  const cognito = new Cognito();
  const dynamodb = new DynamoDb();
  const s3 = new S3();
  const sns = new Sns();
  const setup = new TraceRecorder(); // not shown anywhere

  // the tables of serverless.yml; the films table's indexes exist in the
  // account (the IAM policy names them)
  dynamodb.createTable('films-table', 'filename', {
    'actors-index': 'actors',
    'description-index': 'description',
    'director-index': 'director',
    'genre-index': 'genre',
    'name-index': 'name',
  });
  dynamodb.createTable('favourites-table', 'id');
  dynamodb.createTable('notifications-table', 'id');
  dynamodb.createTable('ratings-table', 'id');
  dynamodb.createTable('counter-table', 'counterName');

  const person = (email: string, nickname: string) => ({
    email,
    password: DEMO_PASSWORD,
    givenName: nickname,
    familyName: 'Demo',
    nickname,
    birthdate: '2000-01-01',
  });
  cognito.addUser(cognito.pools.admin, person(DEMO_ADMIN, 'admin'));
  cognito.addUser(cognito.pools.client, person(DEMO_CLIENT, 'client'));
  RATERS.forEach((email) =>
    cognito.addUser(cognito.pools.client, person(email, email.split('@')[0])),
  );

  FILMS.forEach((film, index) => {
    const date = `2024-0${1 + (index % 6)}-1${index % 9}`;
    const { sizeMb, ...rest } = film;
    const size = sizeMb * 1024 * 1024 + index * 7919;
    dynamodb.put(setup, 'films-table', {
      ...rest,
      type: 'video/mp4',
      size: String(size),
      creationDate: date,
      lastModifiedDate: date,
    });
    s3.put(setup, { key: film.filename, size, type: 'video/mp4', lastModified: date });
  });

  // a few ratings, with ids from the counter table
  const ratings: [string, number, number][] = [
    ['the_general.mp4', 0, 5],
    ['the_general.mp4', 1, 4],
    ['metropolis.mp4', 2, 5],
    ['nosferatu.mp4', 0, 4],
    ['charade.mp4', 1, 5],
    ['his_girl_friday.mp4', 2, 4],
    ['sherlock_jr.mp4', 1, 5],
  ];
  for (const [filename, rater, rating] of ratings) {
    const id = dynamodb.nextId(setup, 'counter-table', 'ratings-table');
    dynamodb.put(setup, 'ratings-table', {
      id,
      userEmail: RATERS[rater],
      filename,
      rating: String(rating),
    });
  }

  // the demo client follows comedies already (a confirmed subscription)
  sns.createTopic(setup, 'Comedy');
  sns.subscriptions.push({
    arn: `${sns.arn('Comedy')}:demo`,
    topic: 'Comedy',
    endpoint: DEMO_CLIENT,
    confirmed: true,
  });

  return { cognito, dynamodb, s3, sns };
}

let state: CloudState | null = null;

export function getCloud(): CloudState {
  return (state ??= createState());
}

export function resetCloud(): CloudState {
  state = createState();
  return state;
}
