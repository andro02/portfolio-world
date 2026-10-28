import { Stations } from '../stations/Stations';
import { Fountain } from './decor/Fountain';
import { Signpost } from './decor/Signpost';
import { Waterfall } from './decor/Waterfall';
import { Nature } from './nature/Nature';
import { AmbientSound } from './AmbientSound';
import { Environment } from './Environment';
import { OccluderFade } from './OccluderFade';
import { SceneReady } from './SceneReady';
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
      <Waterfall />
      <Nature />
      <Fountain />
      <Signpost />
      <Stations />
      <Player />
      <OccluderFade />
      <AmbientSound />
      {/* hides the loading screen once the world has been drawn */}
      <SceneReady />
    </>
  );
}
