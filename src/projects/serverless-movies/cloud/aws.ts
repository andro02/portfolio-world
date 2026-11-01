// The AWS services of the project, simulated in the browser: the two Cognito
// user pools, the DynamoDB tables (with their indexes), the S3 bucket and the
// SNS topics, plus an inbox for the emails SNS would send. Each call records
// a step in a trace, so the panel can show the request's way through the
// cloud: which service did what and how long it took.

export type NodeId =
  'browser' | 'apigw' | 'lambda' | 'cognito' | 'dynamodb' | 's3' | 'sns' | 'email';

export interface TraceStep {
  node: NodeId;
  text: string;
  ms: number;
  detail?: string; // e.g. the item written, shown in a smaller font
  error?: boolean;
}

export interface Trace {
  id: number;
  method: string;
  path: string;
  functionName?: string;
  status: number;
  steps: TraceStep[];
  response?: unknown;
  // what this request would be billed for
  billedMs: number;
  coldStart: boolean;
}

export class TraceRecorder {
  readonly steps: TraceStep[] = [];

  step(node: NodeId, text: string, ms: number, detail?: string, error = false) {
    this.steps.push({ node, text, ms: Math.round(ms), detail, error });
  }
}

// a duration that varies a little, like a real one
export function jitter(base: number, spread = 0.35): number {
  return base * (1 - spread / 2 + Math.random() * spread);
}

// ---- DynamoDB ----

export type Item = Record<string, string | number>;

export interface Table {
  name: string;
  key: string;
  items: Map<string, Item>;
  indexes: Record<string, string>; // index name -> its key attribute
}

const preview = (item: Item) => {
  const text = JSON.stringify(item);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

export class DynamoDb {
  readonly tables = new Map<string, Table>();

  createTable(name: string, key: string, indexes: Record<string, string> = {}) {
    this.tables.set(name, { name, key, items: new Map(), indexes });
  }

  private table(name: string): Table {
    const table = this.tables.get(name);
    if (!table) throw new Error(`ResourceNotFoundException: ${name}`);
    return table;
  }

  scan(trace: TraceRecorder, name: string, filter?: [string, string | number]): Item[] {
    const all = [...this.table(name).items.values()];
    const items = filter ? all.filter((item) => item[filter[0]] === filter[1]) : all;
    trace.step(
      'dynamodb',
      `Scan ${name}${filter ? ` (filter ${filter[0]} = ${JSON.stringify(filter[1])})` : ''}`,
      jitter(14 + all.length * 0.6),
      `${all.length} items scanned, ${items.length} returned`,
    );
    return items;
  }

  // a Query reads only the matching key, on the table or on one of its
  // global secondary indexes: the key has to match exactly
  query(trace: TraceRecorder, name: string, indexName: string | null, value: string): Item[] {
    const table = this.table(name);
    const key = indexName ? table.indexes[indexName] : table.key;
    const items = [...table.items.values()].filter((item) => item[key] === value);
    trace.step(
      'dynamodb',
      `Query ${name}${indexName ? ` INDEX ${indexName}` : ''} WHERE ${key} = ${JSON.stringify(value)}`,
      jitter(9),
      `${items.length} item${items.length === 1 ? '' : 's'}`,
    );
    return items;
  }

  put(trace: TraceRecorder, name: string, item: Item) {
    const table = this.table(name);
    table.items.set(String(item[table.key]), { ...item });
    trace.step('dynamodb', `PutItem ${name}`, jitter(12), preview(item));
  }

  delete(trace: TraceRecorder, name: string, key: string | number) {
    this.table(name).items.delete(String(key));
    trace.step(
      'dynamodb',
      `DeleteItem ${name}`,
      jitter(11),
      `${this.table(name).key} = ${JSON.stringify(key)}`,
    );
  }

  // the atomic counter the project uses for sequential ids: an UpdateItem
  // with "SET currentValue = currentValue + 1", or a PutItem the first time
  nextId(trace: TraceRecorder, counterTable: string, counterName: string): number {
    const table = this.table(counterTable);
    const current = table.items.get(counterName);
    if (!current) {
      trace.step(
        'dynamodb',
        `UpdateItem ${counterTable} → ConditionalCheckFailedException`,
        jitter(10),
        `no counter for ${counterName} yet`,
        true,
      );
      this.put(trace, counterTable, { counterName, currentValue: 1 });
      return 1;
    }
    const next = Number(current.currentValue) + 1;
    table.items.set(counterName, { counterName, currentValue: next });
    trace.step(
      'dynamodb',
      `UpdateItem ${counterTable} SET currentValue = currentValue + 1`,
      jitter(11),
      `${counterName} → ${next}`,
    );
    return next;
  }
}

// ---- S3 ----

export interface S3Object {
  key: string;
  size: number;
  type: string;
  lastModified: string;
}

export class S3 {
  readonly bucket = 'film-bucket';
  readonly objects = new Map<string, S3Object>();

  put(trace: TraceRecorder, object: S3Object) {
    this.objects.set(object.key, object);
    trace.step(
      's3',
      `PutObject s3://${this.bucket}/${object.key}`,
      jitter(40 + object.size / 4_000_000),
      formatSize(object.size),
    );
  }

  get(trace: TraceRecorder, key: string): S3Object | undefined {
    const object = this.objects.get(key);
    trace.step(
      's3',
      `GetObject s3://${this.bucket}/${key}`,
      jitter(object ? 35 : 12),
      object ? formatSize(object.size) : 'NoSuchKey',
      !object,
    );
    return object;
  }

  delete(trace: TraceRecorder, key: string) {
    this.objects.delete(key);
    trace.step('s3', `DeleteObject s3://${this.bucket}/${key}`, jitter(20));
  }
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

// ---- SNS (and the emails it sends) ----

export interface Subscription {
  arn: string;
  topic: string;
  endpoint: string;
  confirmed: boolean;
}

export interface Email {
  id: number;
  to: string;
  subject: string;
  body: string;
  at: number;
  // a subscription confirmation carries the link to confirm it
  confirms?: string;
  read: boolean;
}

const ACCOUNT = '211125334107';
const REGION = 'eu-central-1';

export class Sns {
  readonly topics = new Set<string>();
  readonly subscriptions: Subscription[] = [];
  readonly inbox: Email[] = [];
  private nextEmail = 1;

  arn(topic: string) {
    return `arn:aws:sns:${REGION}:${ACCOUNT}:${topic}`;
  }

  listTopics(trace: TraceRecorder): string[] {
    trace.step('sns', 'ListTopics', jitter(18), `${this.topics.size} topics`);
    return [...this.topics];
  }

  createTopic(trace: TraceRecorder, topic: string) {
    this.topics.add(topic);
    trace.step('sns', `CreateTopic ${topic}`, jitter(30));
  }

  // email subscriptions wait until the address confirms them
  subscribe(trace: TraceRecorder, topic: string, email: string) {
    const existing = this.subscriptions.find(
      (sub) => sub.topic === topic && sub.endpoint === email,
    );
    const subscription = existing ?? {
      arn: `${this.arn(topic)}:${crypto.randomUUID()}`,
      topic,
      endpoint: email,
      confirmed: false,
    };
    if (!existing) this.subscriptions.push(subscription);
    trace.step('sns', `Subscribe ${topic} (email: ${email})`, jitter(25), 'pending confirmation');
    if (!subscription.confirmed) {
      this.send(
        trace,
        email,
        'AWS Notification - Subscription Confirmation',
        `You have chosen to subscribe to the topic:\n${this.arn(topic)}\n\nTo confirm this subscription, click the link below.`,
        subscription.arn,
      );
    }
  }

  confirm(arn: string) {
    const subscription = this.subscriptions.find((sub) => sub.arn === arn);
    if (subscription) subscription.confirmed = true;
  }

  listSubscriptions(trace: TraceRecorder): Subscription[] {
    trace.step(
      'sns',
      'ListSubscriptions',
      jitter(20),
      `${this.subscriptions.length} subscriptions`,
    );
    return [...this.subscriptions];
  }

  unsubscribe(trace: TraceRecorder, arn: string) {
    const index = this.subscriptions.findIndex((sub) => sub.arn === arn);
    if (index >= 0) this.subscriptions.splice(index, 1);
    trace.step('sns', 'Unsubscribe', jitter(22));
  }

  // delivers to the topic's confirmed email subscribers
  publish(trace: TraceRecorder, topic: string, subject: string, message: string) {
    const subscribers = this.subscriptions.filter((sub) => sub.topic === topic && sub.confirmed);
    trace.step(
      'sns',
      `Publish ${topic}`,
      jitter(28),
      `${subscribers.length} confirmed subscriber${subscribers.length === 1 ? '' : 's'}`,
    );
    for (const subscriber of subscribers) this.send(trace, subscriber.endpoint, subject, message);
  }

  private send(trace: TraceRecorder, to: string, subject: string, body: string, confirms?: string) {
    this.inbox.unshift({
      id: this.nextEmail++,
      to,
      subject,
      body,
      at: Date.now(),
      confirms,
      read: false,
    });
    trace.step('email', `Email to ${to}`, jitter(60), subject);
  }
}

// ---- Cognito ----

export interface CognitoUser {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  nickname: string;
  birthdate: string;
  sub: string;
}

export interface UserPool {
  id: string;
  name: string;
  clientId: string;
  users: Map<string, CognitoUser>;
}

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

// the access token's claims (what API Gateway's JWT authorizer checks)
export interface TokenClaims {
  sub: string;
  iss: string;
  client_id: string;
  token_use: 'access';
  username: string;
  exp: number;
  iat: number;
}

export function decodeToken(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as TokenClaims;
  } catch {
    return null;
  }
}

export class Cognito {
  readonly pools: Record<'client' | 'admin', UserPool> = {
    client: {
      id: `${REGION}_ulN0PG00O`,
      name: 'client-pool',
      clientId: '723a4agnkb2dkc5gh6jugbink4',
      users: new Map(),
    },
    admin: {
      id: `${REGION}_vrLRXtUbL`,
      name: 'admin-pool',
      clientId: '5afcgqvifnkdv00637t72c25id',
      users: new Map(),
    },
  };

  issuer(pool: UserPool) {
    return `https://cognito-idp.${REGION}.amazonaws.com/${pool.id}`;
  }

  addUser(pool: UserPool, user: Omit<CognitoUser, 'sub'>) {
    pool.users.set(user.email, { ...user, sub: crypto.randomUUID() });
  }

  // AdminInitiateAuth with ADMIN_NO_SRP_AUTH: email and password in, tokens out
  initiateAuth(trace: TraceRecorder, pool: UserPool, email: string, password: string) {
    const user = pool.users.get(email);
    if (!user) {
      trace.step(
        'cognito',
        `AdminInitiateAuth ${pool.name} → UserNotFoundException`,
        jitter(45),
        undefined,
        true,
      );
      return { error: 'UserNotFoundException' as const };
    }
    if (user.password !== password) {
      trace.step(
        'cognito',
        `AdminInitiateAuth ${pool.name} → NotAuthorizedException`,
        jitter(60),
        undefined,
        true,
      );
      return { error: 'NotAuthorizedException' as const };
    }
    const now = Math.floor(Date.now() / 1000);
    const claims: TokenClaims = {
      sub: user.sub,
      iss: this.issuer(pool),
      client_id: pool.clientId,
      token_use: 'access',
      username: email,
      iat: now,
      exp: now + 5 * 3600, // AccessTokenValidity: 5 (hours)
    };
    const token = `${base64url({ kid: pool.id, alg: 'RS256' })}.${base64url(claims)}.simulated-signature`;
    trace.step(
      'cognito',
      `AdminInitiateAuth ${pool.name}`,
      jitter(110),
      'AccessToken, IdToken, RefreshToken',
    );
    return {
      result: { AccessToken: token, ExpiresIn: 18000, TokenType: 'Bearer' },
    };
  }

  listUsers(trace: TraceRecorder, pool: UserPool, filter?: string): CognitoUser[] {
    trace.step('cognito', `ListUsers ${pool.name}${filter ? ` (${filter})` : ''}`, jitter(40));
    return [...pool.users.values()];
  }

  createUser(trace: TraceRecorder, pool: UserPool, user: Omit<CognitoUser, 'sub'>) {
    this.addUser(pool, user);
    trace.step('cognito', `AdminCreateUser ${pool.name}`, jitter(90), user.email);
    trace.step('cognito', 'AdminSetUserPassword (permanent)', jitter(55));
  }
}
