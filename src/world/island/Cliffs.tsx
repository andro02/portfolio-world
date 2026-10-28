import { useMemo } from 'react';
import { projects } from '../../projects/registry';
import { GRASS_END, shoreRadius, terrainHeight } from './islandShape';
import { distanceToPaths } from './paths';
import { between, createRandom } from './random';
import { distanceToWaterfall } from '../decor/waterfallLayout';
import { PILLAR_VARIANTS, Pillar, type PillarProps } from './Pillar';

const CLIFF_COLORS = ['#8f8a80', '#a29c90', '#7f7a71'];
const START_RADIUS = 7; // first pillars stand a little away from the plaza
const SPACING = 2.4; // distance between pillars along a ridge
const CLEARANCE = 1.5; // free space kept between a pillar and the nearest path

// ridges of pillars between every two neighbouring paths, from near the plaza
// to where the beach starts, so the paths become the natural way around
function placePillars(): PillarProps[] {
  const random = createRandom(7);
  const pillars: PillarProps[] = [];

  const angles = projects
    .map(({ meta }) => Math.atan2(meta.position[2], meta.position[0]))
    .sort((a, b) => a - b);

  angles.forEach((angle, index) => {
    const next =
      angles[(index + 1) % angles.length] + (index === angles.length - 1 ? Math.PI * 2 : 0);
    const ridgeAngle = (angle + next) / 2;
    const end = shoreRadius(ridgeAngle) * (GRASS_END + 0.05);

    for (let along = START_RADIUS; along < end; along += SPACING) {
      // wander a little to the sides so the ridge isn't a straight line
      const side = between(random, -1.2, 1.2);
      const x = Math.cos(ridgeAngle) * along - Math.sin(ridgeAngle) * side;
      const z = Math.sin(ridgeAngle) * along + Math.cos(ridgeAngle) * side;
      const radius = between(random, 1.2, 2.1);

      if (distanceToPaths(x, z) < radius + CLEARANCE) continue;
      // the waterfall has rocks of its own
      if (distanceToWaterfall(x, z) < radius + 1) continue;

      pillars.push({
        // sunk into the ground so uneven terrain never shows a gap under it
        position: [x, terrainHeight(x, z) - 0.6, z],
        radius,
        height: between(random, 3.5, 6.5),
        rotation: random() * Math.PI * 2,
        color: CLIFF_COLORS[Math.floor(random() * CLIFF_COLORS.length)],
        variant: Math.floor(random() * PILLAR_VARIANTS),
      });
    }
  });

  return pillars;
}

export function Cliffs() {
  const pillars = useMemo(() => placePillars(), []);

  return (
    <>
      {pillars.map((pillar, index) => (
        <Pillar key={index} {...pillar} />
      ))}
    </>
  );
}
