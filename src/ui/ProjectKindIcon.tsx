import type { ProjectKind } from '../projects/types';

// simple line icon for each kind of project
const PATHS: Record<ProjectKind, string[]> = {
  // browser window
  web: ['M3 5h18v14H3z', 'M3 9h18', 'M6 7h.01M8.5 7h.01'],
  // terminal prompt
  console: ['M3 5h18v14H3z', 'm7 10 3 2.5L7 15', 'M12.5 15H17'],
  // house with a signal above it
  iot: ['M5 12v8h14v-8', 'm3 13 9-7 9 7', 'M10 20v-4h4v4', 'M9.5 3.5a4 4 0 0 1 5 0'],
  // eye with a focus frame (computer vision)
  ml: [
    'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z',
    'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ],
  // cloud
  backend: ['M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 10.5 3.75 3.75 0 0 0 7 18z'],
};

export function ProjectKindIcon({ kind }: { kind: ProjectKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
