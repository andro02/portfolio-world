// GLSL code of the waves, shared by the water surface and the shore foam so
// that the foam always follows the actual height of the water.
export const WAVE_FUNCTION = /* glsl */ `
float waveHeight(vec2 position, float time) {
  return sin(position.x * 0.35 + time * 1.1) * 0.08
    + sin(position.y * 0.27 + time * 0.8) * 0.08;
}
`;
