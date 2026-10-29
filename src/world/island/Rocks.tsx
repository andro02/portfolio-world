import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { ROCK } from '../surfaceTags';
import { IcosahedronGeometry } from 'three';
import { registerOccluder } from '../occluders';
import { ROCKS, ROCK_COLLIDER_MIN_SCALE } from './rockLayout';

// a few rock shapes: an icosahedron whose corners are pushed in or out; the push
// depends only on the corner's position, so corners shared by faces stay joined
function createRockGeometry(seed: number) {
  const geometry = new IcosahedronGeometry(1, 0);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const push = 0.75 + 0.5 * Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed));
    position.setXYZ(i, x * push, y * push * 0.7, z * push); // a bit flattened
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function Rocks() {
  const geometries = useMemo(() => [1, 2, 3].map((seed) => createRockGeometry(seed)), []);

  return (
    <>
      {ROCKS.map((rock, index) => {
        const mesh = (
          <mesh
            ref={registerOccluder}
            geometry={geometries[rock.variant]}
            rotation={rock.rotation}
            scale={rock.scale}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={rock.color} flatShading />
          </mesh>
        );

        // only bigger rocks block the player; "hull" makes a collider that wraps
        // the rock's exact shape, like a sheet of plastic wrapped around it
        return rock.scale >= ROCK_COLLIDER_MIN_SCALE ? (
          <RigidBody
            key={index}
            type="fixed"
            colliders="hull"
            position={rock.position}
            userData={ROCK}
          >
            {mesh}
          </RigidBody>
        ) : (
          <group key={index} position={rock.position}>
            {mesh}
          </group>
        );
      })}
    </>
  );
}
