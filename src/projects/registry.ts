import type { ProjectMeta } from './types';
import { fleetMonitoring } from './fleet-monitoring/meta';
import { kvStorageEngine } from './kv-storage-engine/meta';
import { landfillDetection } from './landfill-detection/meta';
import { serverlessMovies } from './serverless-movies/meta';
import { smartHomeIot } from './smart-home-iot/meta';

// single source of truth for all projects shown in the world
// (interactive showcases will be registered here in a later step)
export const projects: ProjectMeta[] = [
  landfillDetection,
  fleetMonitoring,
  smartHomeIot,
  serverlessMovies,
  kvStorageEngine,
];

export function getProject(slug: string): ProjectMeta | undefined {
  return projects.find((project) => project.slug === slug);
}
