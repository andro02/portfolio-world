import type { ComponentType } from 'react';

export type ProjectKind = 'web' | 'console' | 'iot' | 'ml' | 'backend';

// icons available for projects: one per kind, plus extra ones a project can pick
export type ProjectIconName = ProjectKind | 'factory';

// decorative style of a project's panel, matching what the project is about
export type PanelTheme = 'terminal' | 'detection' | 'circuit' | 'route' | 'cloud';

export interface ProjectMeta {
  slug: string; // unique identifier, e.g. 'kv-storage-engine'
  title: string;
  year: number;
  kind: ProjectKind;
  summary: string;
  tech: string[];
  links: { github?: string; demo?: string };
  position: [number, number, number]; // station position on the map
  accent: string; // the project's own color, used in its panel
  icon?: ProjectIconName; // defaults to the icon of the project's kind
  theme?: PanelTheme; // panels without a theme get the plain design
  highlights?: string[]; // a few short points about what was built
}

export interface StationModelProps {
  highlighted: boolean; // true while the player stands at the station
}

// custom 3D model of a station; it is placed facing the path (local +z points
// towards the plaza) and must stay within about 3 x 3 units, adding its own
// colliders for the parts the player shouldn't walk through
export interface StationDesign {
  Model: ComponentType<StationModelProps>;
  labelHeight: number; // height of the floating title above the ground
}

export interface ProjectDefinition {
  meta: ProjectMeta;
  // loads the interactive showcase; its code is downloaded separately, ahead of
  // time (see showcaseLoader.ts), so the main page stays small
  // (optional so projects can be added before their showcase is built)
  loadShowcase?: () => Promise<{ default: ComponentType }>;
  // custom station on the map; projects without one get a plain pedestal
  station?: StationDesign;
}
