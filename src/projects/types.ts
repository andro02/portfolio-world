import type { ComponentType, LazyExoticComponent } from 'react';

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
  // interactive showcase, lazy-loaded the first time its panel is opened
  // (optional so projects can be added before their showcase is built)
  Showcase?: LazyExoticComponent<ComponentType>;
}
