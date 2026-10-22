import { Stations } from '../stations/Stations';
import { Environment } from './Environment';
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
      <Terrain />
      <Water />
      <IslandBoundary />
      <Rocks />
      <Cliffs />
      <Stations />
      <Player />
    </>
  );
}
