import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { ExtrudeGeometry, Shape } from 'three';
import { projects } from '../../projects/registry';
import { terrainHeight } from '../island/islandShape';
import { PLAZA_RADIUS } from '../island/paths';

// Wooden signpost on the plaza, to the left of the fountain, with one
// arrow-shaped board for every project, pointing towards its station.

const POST_COLOR = '#8a5a3b';
const BOARD_COLOR = '#d2a36c';
const TEXT_COLOR = '#4a2f1c';

// left of the fountain (seen from where the player starts), between the
// paths to the KV Engine and the Movie Platform, where no path starts
const ANGLE = 2.83;
const DISTANCE = PLAZA_RADIUS - 1.1;
const X = Math.cos(ANGLE) * DISTANCE;
const Z = Math.sin(ANGLE) * DISTANCE;

const POST_HEIGHT = 3.7;
const BOARD_LENGTH = 2.2;
const BOARD_HEIGHT = 0.4;
const BOARD_DEPTH = 0.08;
const TIP_LENGTH = 0.3; // the pointed end of the board
const LOWEST_BOARD = 1.65; // above the fox's ears, so it can walk under them
const BOARD_SPACING = 0.42;

// flat arrow pointing along +x, starting at the post: a rectangle with a
// pointed end, made thick by extruding it
function createBoardGeometry() {
  const half = BOARD_HEIGHT / 2;
  const shape = new Shape()
    .moveTo(0, -half)
    .lineTo(BOARD_LENGTH - TIP_LENGTH, -half)
    .lineTo(BOARD_LENGTH, 0)
    .lineTo(BOARD_LENGTH - TIP_LENGTH, half)
    .lineTo(0, half)
    .closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: BOARD_DEPTH, bevelEnabled: false });
  geometry.translate(0, 0, -BOARD_DEPTH / 2); // centred on the board's thickness
  return geometry;
}

export function Signpost() {
  const boardGeometry = useMemo(() => createBoardGeometry(), []);

  // one board per project, turned towards its station
  const boards = useMemo(
    () =>
      projects.map(({ meta }) => {
        const direction = Math.atan2(meta.position[2] - Z, meta.position[0] - X);
        return { slug: meta.slug, label: meta.shortTitle ?? meta.title, direction };
      }),
    [],
  );

  // middle of the text on the board, between the post and the pointed end
  const textX = (BOARD_LENGTH - TIP_LENGTH) / 2 + 0.06;
  const textProps = {
    fontSize: 0.19,
    color: TEXT_COLOR,
    anchorX: 'center',
    anchorY: 'middle',
    maxWidth: BOARD_LENGTH - TIP_LENGTH - 0.1,
  } as const;

  return (
    <group position={[X, terrainHeight(X, Z), Z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[POST_HEIGHT / 2, 0.16]} position={[0, POST_HEIGHT / 2, 0]} />
      </RigidBody>

      {/* post with a small pointed cap */}
      <mesh position={[0, POST_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.14, POST_HEIGHT, 6]} />
        <meshStandardMaterial color={POST_COLOR} flatShading />
      </mesh>
      <mesh position={[0, POST_HEIGHT + 0.11, 0]} castShadow>
        <coneGeometry args={[0.17, 0.22, 6]} />
        <meshStandardMaterial color={POST_COLOR} flatShading />
      </mesh>

      {/* a few stones holding the post */}
      {[0, 1.9, 3.8, 5.1].map((angle, index) => (
        <mesh
          key={angle}
          position={[Math.cos(angle) * 0.26, 0.06, Math.sin(angle) * 0.26]}
          rotation={[angle, angle * 2, 0]}
          scale={[1, 0.6, 1]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[0.13 + (index % 2) * 0.04, 0]} />
          <meshStandardMaterial color="#a39d91" flatShading />
        </mesh>
      ))}

      {boards.map((board, index) => (
        // rotating around y by -angle turns the board's +x towards the station
        <group
          key={board.slug}
          position={[0, LOWEST_BOARD + index * BOARD_SPACING, 0]}
          rotation={[0, -board.direction, 0]}
        >
          <mesh geometry={boardGeometry} castShadow receiveShadow>
            <meshStandardMaterial color={BOARD_COLOR} flatShading />
          </mesh>
          {/* the name on both sides of the board */}
          <Text position={[textX, 0, BOARD_DEPTH / 2 + 0.005]} {...textProps}>
            {board.label}
          </Text>
          <Text
            position={[textX, 0, -BOARD_DEPTH / 2 - 0.005]}
            rotation={[0, Math.PI, 0]}
            {...textProps}
          >
            {board.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
