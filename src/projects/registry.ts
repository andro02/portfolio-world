import type { ProjectDefinition } from './types';
import { fleetMonitoring } from './fleet-monitoring/meta';
import { kvStorageEngine } from './kv-storage-engine/meta';
import { landfillDetection } from './landfill-detection/meta';
import { serverlessMovies } from './serverless-movies/meta';
import { smartHomeIot } from './smart-home-iot/meta';
import { lazy } from 'react';

// single source of truth for all projects shown in the world
export const projects: ProjectDefinition[] = [
  { meta: landfillDetection },
  { meta: fleetMonitoring },
  { meta: smartHomeIot },
  { meta: serverlessMovies },
  { meta: kvStorageEngine, Showcase: lazy(() => import('./kv-storage-engine/Showcase')) },
];

export function getProject(slug: string): ProjectDefinition | undefined {
  return projects.find((project) => project.meta.slug === slug);
}
