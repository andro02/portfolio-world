export type Control = 'forward' | 'backward' | 'left' | 'right' | 'jump';

// maps each action to its keys; KeyW etc. are layout-independent key codes
export const keyboardMap: { name: Control; keys: string[] }[] = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];
