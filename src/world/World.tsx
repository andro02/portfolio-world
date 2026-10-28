import { Stations } from '../stations/Stations';
import { Environment } from './Environment';
import { OccluderFade } from './OccluderFade';
import { ShadowCasters } from './ShadowCasters';
import { Cliffs } from './island/Cliffs';
import { IslandBoundary } from './island/IslandBoundary';
import { Rocks } from './island/Rocks';
import { Terrain } from './island/Terrain';
import { Water } from './island/Water';
import { Player } from './player/Player';

export function World() {
  return (
    <>
      <Environment />
      <ShadowCasters />
      <Terrain />
      <Water />
      <IslandBoundary />
      <Rocks />
      <Cliffs />
      <Stations />
      <Player />
      <OccluderFade />
    </>
  );
}
