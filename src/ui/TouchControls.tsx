import { useEffect, useRef, type PointerEvent } from 'react';
import { useGameStore } from '../store/useGameStore';
import { resetTouchInput, touchInput } from '../world/player/touchInput';

// On-screen controls for phones and tablets: a joystick in the bottom left
// corner for walking and a jump button in the bottom right one. They write to
// touchInput, which the Player reads every frame. Shown only on touch screens
// (see touch.css).
//
// Pointer events work the same for fingers, pens and the mouse. With pointer
// capture, the joystick keeps getting the finger's moves even when the finger
// slides off it, until it is lifted.

const STICK_RANGE = 46; // how far (in pixels) the knob can move from the middle
const DEAD_ZONE = 0.12; // tiny pushes near the middle are ignored

export function TouchControls() {
  const isPanelOpen = useGameStore((s) => s.openProject !== null);
  const knob = useRef<HTMLDivElement>(null);
  const finger = useRef<number | null>(null); // id of the finger on the joystick
  const center = useRef({ x: 0, y: 0 }); // middle of the joystick on the screen

  // when a panel opens, the fingers are lifted for the game: stop walking
  useEffect(() => {
    if (isPanelOpen) resetTouchInput();
    return resetTouchInput;
  }, [isPanelOpen]);

  const moveStick = (event: PointerEvent) => {
    let dx = event.clientX - center.current.x;
    let dy = event.clientY - center.current.y;
    const distance = Math.hypot(dx, dy);
    // the knob stays inside the ring
    if (distance > STICK_RANGE) {
      dx = (dx / distance) * STICK_RANGE;
      dy = (dy / distance) * STICK_RANGE;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;

    const push = Math.min(distance, STICK_RANGE) / STICK_RANGE;
    touchInput.x = push > DEAD_ZONE ? dx / STICK_RANGE : 0;
    touchInput.z = push > DEAD_ZONE ? dy / STICK_RANGE : 0;
  };

  const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== finger.current) return;
    finger.current = null;
    touchInput.x = 0;
    touchInput.z = 0;
    if (knob.current) knob.current.style.transform = '';
  };

  return (
    <div className="touch-controls" data-hidden={isPanelOpen}>
      <div
        className="joystick"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          finger.current = event.pointerId;
          const box = event.currentTarget.getBoundingClientRect();
          center.current = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
          moveStick(event);
        }}
        onPointerMove={(event) => {
          if (event.pointerId === finger.current) moveStick(event);
        }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        aria-hidden="true"
      >
        <div ref={knob} className="joystick-knob" />
      </div>

      <button
        className="jump-button"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          touchInput.jump = true;
        }}
        onPointerUp={() => {
          touchInput.jump = false;
        }}
        onPointerCancel={() => {
          touchInput.jump = false;
        }}
        // the jump happens on press; a click (or Enter) does nothing extra
        aria-label="Jump"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V6M6 11l6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}
