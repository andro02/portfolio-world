import type { ProjectDefinition } from './types';
import { fleetMonitoring } from './fleet-monitoring/meta';
import { FleetStationModel } from './fleet-monitoring/StationModel';
import { kvStorageEngine } from './kv-storage-engine/meta';
import { KvStationModel } from './kv-storage-engine/StationModel';
import { landfillDetection } from './landfill-detection/meta';
import { LandfillStationModel } from './landfill-detection/StationModel';
import { serverlessMovies } from './serverless-movies/meta';
import { MoviesStationModel } from './serverless-movies/StationModel';
import { smartHomeIot } from './smart-home-iot/meta';
import { SmartHomeStationModel } from './smart-home-iot/StationModel';

// single source of truth for all projects shown in the world
export const projects: ProjectDefinition[] = [
  {
    meta: landfillDetection,
    station: { Model: LandfillStationModel, labelHeight: 3.3, sound: 'satellite' },
  },
  {
    meta: fleetMonitoring,
    station: { Model: FleetStationModel, labelHeight: 2.9, sound: 'machines' },
  },
  {
    meta: smartHomeIot,
    station: { Model: SmartHomeStationModel, labelHeight: 2.6, sound: 'beeps' },
  },
  {
    meta: serverlessMovies,
    station: { Model: MoviesStationModel, labelHeight: 3.4, sound: 'projector' },
  },
  {
    meta: kvStorageEngine,
    loadShowcase: () => import('./kv-storage-engine/Showcase'),
    station: { Model: KvStationModel, labelHeight: 2.6, sound: 'typing' },
  },
];

export function getProject(slug: string): ProjectDefinition | undefined {
  return projects.find((project) => project.meta.slug === slug);
}
