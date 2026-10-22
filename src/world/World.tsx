import { Stations } from '../stations/Stations';
import { Environment } from './Environment';
import { IslandBoundary } from './island/IslandBoundary';
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
      <Stations />
      <Player />
    </>
  );
}
