import { Stations } from '../stations/Stations';
import { Environment } from './Environment';
import { Island } from './island/Island';
import { IslandBoundary } from './island/IslandBoundary';
import { Water } from './island/Water';
import { Player } from './player/Player';

export function World() {
  return (
    <>
      <Environment />
      <Water />
      <Island />
      <IslandBoundary />
      <Stations />
      <Player />
    </>
  );
}
