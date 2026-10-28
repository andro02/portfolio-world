import type { WebGLProgramParametersWithUniforms } from 'three';
import { playerWorldPosition } from './player/playerState';

// "See-through" objects: when a rock or a cliff stands between the camera and
// the player, the part of it around the player is not drawn, so the player
// stays visible.
//
// The hole is a cone from the camera to the player: every pixel of the object
// that is inside the cone and in front of the player is skipped. The edge of
// the hole fades out with a dither pattern (more and more pixels skipped
// towards the middle) instead of real transparency, so the objects stay solid
// and don't have to be sorted by distance. Shadows are not affected.

// radius of the hole around the player, in world units
const RADIUS = 1.6;
// pixels this close in front of the player stay visible, so objects right next
// to the player don't get cut
const KEEP_IN_FRONT = 0.4;

// one shared uniform for every material: its value is the very Vector3 the
// Player component updates every frame, so nothing has to copy it
const target = { value: playerWorldPosition };

// pass as onBeforeCompile of a material to make objects using it see-through
export function applySeeThrough(shader: WebGLProgramParametersWithUniforms) {
  shader.uniforms.uSeeThroughTarget = target;

  // vertex shader: pass the world position of every pixel to the fragment shader
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vSeeThroughWorld;')
    .replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
      vec4 seeThroughWorld = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        seeThroughWorld = instanceMatrix * seeThroughWorld;
      #endif
      vSeeThroughWorld = (modelMatrix * seeThroughWorld).xyz;`,
    );

  // fragment shader: skip pixels inside the cone
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      /* glsl */ `#include <common>
      uniform vec3 uSeeThroughTarget;
      varying vec3 vSeeThroughWorld;`,
    )
    .replace(
      '#include <clipping_planes_fragment>',
      /* glsl */ `#include <clipping_planes_fragment>
      {
        vec3 toTarget = uSeeThroughTarget - cameraPosition;
        float targetDistance = length(toTarget);
        vec3 viewDirection = toTarget / targetDistance;
        vec3 toPixel = vSeeThroughWorld - cameraPosition;

        // distance of the pixel along the line from the camera to the player
        float along = dot(toPixel, viewDirection);
        if (along > 0.0 && along < targetDistance - ${KEEP_IN_FRONT.toFixed(2)}) {
          // the cone is narrower closer to the camera, so on the screen the
          // hole is a circle of the same size around the player
          float radius = ${RADIUS.toFixed(2)} * along / targetDistance;
          float distanceFromLine = length(toPixel - viewDirection * along);
          float hidden = 1.0 - smoothstep(radius * 0.55, radius, distanceFromLine);

          // dither: a different threshold for neighbouring pixels
          float threshold = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (hidden > threshold) discard;
        }
      }`,
    );
}
