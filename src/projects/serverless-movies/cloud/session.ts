// Who is signed in to the simulated app, kept for this page (the Angular app
// keeps the token and role in localStorage). Shared so that closing and
// opening the panel keeps the visitor signed in.

export interface Session {
  token: string | null;
  role: 'Admin' | 'Client' | null;
  email: string;
}

export const SIGNED_OUT: Session = { token: null, role: null, email: '' };

let current: Session = SIGNED_OUT;

export function getSession(): Session {
  return current;
}

export function setSession(session: Session) {
  current = session;
}
