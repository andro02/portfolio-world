import { useState } from 'react';
import { formatSize } from '../cloud/aws';
import { getCloud } from '../cloud/state';

// What is stored: the DynamoDB tables item by item, the S3 bucket, the SNS
// topics and their subscriptions, and the inbox of the emails SNS sent.

const SOURCES = [
  'films-table',
  'ratings-table',
  'counter-table',
  'favourites-table',
  'notifications-table',
  's3://film-bucket',
  'SNS topics',
] as const;

type Source = (typeof SOURCES)[number];

// JSON with a space after each separator, so it wraps between fields
const spaced = (text: string) => text.replace(/,(?=")/g, ', ').replace(/":/g, '": ');

export function Tables() {
  const [source, setSource] = useState<Source>('films-table');
  const cloud = getCloud();

  let rows: { key: string; value: string }[];
  let note = '';
  if (source === 's3://film-bucket') {
    rows = [...cloud.s3.objects.values()].map((object) => ({
      key: object.key,
      value: `${formatSize(object.size)} · ${object.type} · ${object.lastModified}`,
    }));
  } else if (source === 'SNS topics') {
    rows = [...cloud.sns.topics].map((topic) => {
      const subscribers = cloud.sns.subscriptions.filter((sub) => sub.topic === topic);
      return {
        key: topic,
        value:
          subscribers.length === 0
            ? 'no subscribers'
            : subscribers
                .map((sub) => `${sub.endpoint}${sub.confirmed ? '' : ' (pending)'}`)
                .join(', '),
      };
    });
  } else {
    const table = cloud.dynamodb.tables.get(source)!;
    rows = [...table.items.values()].map((item) => {
      const { [table.key]: key, ...rest } = item;
      return { key: String(key), value: spaced(JSON.stringify(rest)) };
    });
    const indexes = Object.keys(table.indexes);
    note = `Partition key: ${table.key}${indexes.length ? ` · indexes: ${indexes.join(', ')}` : ''}`;
    if (source === 'favourites-table' || source === 'notifications-table') {
      note += ' · unused: favourites live in SNS (the table code is commented out)';
    }
  }

  return (
    <div className="mc-tables">
      <select
        value={source}
        onChange={(event) => setSource(event.target.value as Source)}
        aria-label="Table"
      >
        {SOURCES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <p className="mc-muted">
        {rows.length} item{rows.length === 1 ? '' : 's'}
        {note && ` · ${note}`}
      </p>
      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <code className="mc-key">{row.key}</code>
            <code>{row.value}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Inbox({ onChange }: { onChange: () => void }) {
  const cloud = getCloud();
  const [open, setOpen] = useState<number | null>(cloud.sns.inbox[0]?.id ?? null);
  const emails = cloud.sns.inbox;

  if (emails.length === 0) {
    return (
      <p className="mc-muted mc-trace-empty">
        No emails yet. As a client, follow a genre, director or actor; SNS sends a confirmation
        email, and later a message whenever an admin uploads a matching film.
      </p>
    );
  }

  return (
    <ul className="mc-inbox">
      {emails.map((email) => {
        const subscription = email.confirms
          ? cloud.sns.subscriptions.find((sub) => sub.arn === email.confirms)
          : undefined;
        return (
          <li key={email.id} data-read={email.read}>
            <button
              type="button"
              className="mc-mail-head"
              onClick={() => {
                email.read = true;
                setOpen(open === email.id ? null : email.id);
                onChange();
              }}
            >
              <strong>{email.subject}</strong>
              <span className="mc-muted">
                to {email.to} · {new Date(email.at).toTimeString().slice(0, 5)}
              </span>
            </button>
            {open === email.id && (
              <div className="mc-mail-body">
                <p>{email.body}</p>
                {email.confirms &&
                  (subscription?.confirmed ? (
                    <p className="mc-ok">Subscription confirmed.</p>
                  ) : subscription ? (
                    <button
                      type="button"
                      className="mc-primary"
                      onClick={() => {
                        cloud.sns.confirm(subscription.arn);
                        onChange();
                      }}
                    >
                      Confirm subscription
                    </button>
                  ) : (
                    <p className="mc-muted">This subscription no longer exists.</p>
                  ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
