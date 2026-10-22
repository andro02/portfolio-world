import { Environment } from './Environment';
import { Player } from './player/Player';
import { Terrain } from './Terrain';

export function World() {
  return (
    <>
      <Environment />
      <Terrain />
      <Player />
    </>
  );
}
