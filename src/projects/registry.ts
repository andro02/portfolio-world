import type { ProjectDefinition } from './types';
import { fleetMonitoring } from './fleet-monitoring/meta';
import { kvStorageEngine } from './kv-storage-engine/meta';
import { KvStationModel } from './kv-storage-engine/StationModel';
import { landfillDetection } from './landfill-detection/meta';
import { serverlessMovies } from './serverless-movies/meta';
import { smartHomeIot } from './smart-home-iot/meta';

// single source of truth for all projects shown in the world
export const projects: ProjectDefinition[] = [
  { meta: landfillDetection },
  { meta: fleetMonitoring },
  { meta: smartHomeIot },
  { meta: serverlessMovies },
  {
    meta: kvStorageEngine,
    loadShowcase: () => import('./kv-storage-engine/Showcase'),
    station: { Model: KvStationModel, labelHeight: 2.6, sound: 'typing' },
  },
];

export function getProject(slug: string): ProjectDefinition | undefined {
  return projects.find((project) => project.meta.slug === slug);
}
