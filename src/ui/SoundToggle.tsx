import { useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { startAmbience } from '../audio/ambience';
import { useGameStore } from '../store/useGameStore';
import type { Control } from '../world/player/controls';

function toggle() {
  const store = useGameStore.getState();
  store.toggleSound();
  // switching on is a click or key press, so the browser allows sound now
  if (!store.soundOn) startAmbience();
}

// round button (and the M key) that switches the ambient sound on and off
export function SoundToggle() {
  const [subscribe] = useKeyboardControls<Control>();
  const soundOn = useGameStore((s) => s.soundOn);

  useEffect(
    () =>
      subscribe(
        (state) => state.toggleSound,
        (pressed) => {
          // M may be typed into a project's terminal, so not while a panel is open
          if (pressed && !useGameStore.getState().openProject) toggle();
        },
      ),
    [subscribe],
  );

  return (
    <button
      className="sound-toggle"
      onClick={toggle}
      aria-pressed={soundOn}
      aria-label="Sound"
      title={soundOn ? 'Sound off (M)' : 'Sound on (M)'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* speaker */}
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {soundOn ? (
          // sound waves
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        ) : (
          // a cross: muted
          <path d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  );
}
