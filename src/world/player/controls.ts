export type Control =
  | 'forward'
  | 'backward'
  | 'left'
  | 'right'
  | 'jump'
  | 'interact'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetView';

// maps each action to its keys; KeyW etc. are layout-independent key codes
export const keyboardMap: { name: Control; keys: string[] }[] = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'interact', keys: ['KeyE'] },
  // "+" is the same key as "=" on most keyboards
  { name: 'zoomIn', keys: ['Equal', 'NumpadAdd'] },
  { name: 'zoomOut', keys: ['Minus', 'NumpadSubtract'] },
  { name: 'resetView', keys: ['KeyR'] },
];
