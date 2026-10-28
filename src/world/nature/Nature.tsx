import { Palms } from './Palms';
import { SmallPlants } from './SmallPlants';
import { Trees } from './Trees';

// all plants on the island
export function Nature() {
  return (
    <>
      <Palms />
      <Trees />
      <SmallPlants />
    </>
  );
}
