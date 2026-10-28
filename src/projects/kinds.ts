import type { ProjectKind } from './types';

// short name of each kind of project, shown on station labels and panels
export const KIND_LABELS: Record<ProjectKind, string> = {
  web: 'Web app',
  console: 'Systems',
  iot: 'IoT',
  ml: 'Machine learning',
  backend: 'Cloud backend',
};
