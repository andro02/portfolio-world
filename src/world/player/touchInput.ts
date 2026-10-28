// Input from the on-screen touch controls (TouchControls.tsx), read by the
// Player component every frame next to the keyboard. A plain shared object,
// like playerMotion: it changes many times per second, and React state would
// re-render on every change.
export const touchInput = {
  // joystick: -1..1 on each axis, x to the right and z towards the camera
  // (down on the screen), like the keyboard directions; the further the stick
  // is pushed, the faster the fox walks
  x: 0,
  z: 0,
  jump: false, // true while the jump button is held
};

export function resetTouchInput() {
  touchInput.x = 0;
  touchInput.z = 0;
  touchInput.jump = false;
}
