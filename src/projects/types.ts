import type { ComponentType } from 'react';

export type ProjectKind = 'web' | 'console' | 'iot' | 'ml' | 'backend';

export interface ProjectMeta {
  slug: string; // unique identifier, e.g. 'kv-storage-engine'
  title: string;
  year: number;
  kind: ProjectKind;
  summary: string;
  tech: string[];
  links: { github?: string; demo?: string };
  position: [number, number, number]; // station position on the map
}

export interface ProjectDefinition {
  meta: ProjectMeta;
  // interactive showcase, lazy-loaded when the player approaches the station
  Showcase: ComponentType;
}
