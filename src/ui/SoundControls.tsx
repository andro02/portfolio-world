import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { startAmbience } from '../audio/ambience';
import { useGameStore } from '../store/useGameStore';
import type { Control } from '../world/player/controls';

// Round speaker button (in the top bar) that opens a small panel with a
// switch for all sound and two sliders: one for the music, one for all the
// other sounds (water, stations). The M key switches all sound on and off.

function toggleSound() {
  const store = useGameStore.getState();
  store.toggleSound();
  // switching on is a click or key press, so the browser allows sound now
  if (!store.soundOn) startAmbience();
}

export function SoundControls() {
  const [open, setOpen] = useState(false);
  const [subscribe] = useKeyboardControls<Control>();
  const soundOn = useGameStore((s) => s.soundOn);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const soundsVolume = useGameStore((s) => s.soundsVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setSoundsVolume = useGameStore((s) => s.setSoundsVolume);
  const menu = useRef<HTMLDivElement>(null);

  // M switches the sound on and off
  useEffect(
    () =>
      subscribe(
        (state) => state.toggleSound,
        (pressed) => {
          // M may be typed into a project's terminal, so not while a panel is open
          if (pressed && !useGameStore.getState().openProject) toggleSound();
        },
      ),
    [subscribe],
  );

  // close the panel with Escape or a click anywhere outside it
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // a slider moved up switches the sound on, so the sound has to be started
  // too (moving a slider counts as an interaction, so the browser allows it)
  const onSlider =
    (setVolume: (volume: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      setVolume(Number(event.target.value));
      if (useGameStore.getState().soundOn) startAmbience();
    };

  return (
    <div ref={menu} className="sound-menu">
      <button
        className="sound-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="sound-panel"
        aria-label="Sound settings"
        title="Sound (M to switch on or off)"
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

      <div id="sound-panel" className="sound-panel" data-open={open} inert={!open}>
        <label className="sound-row">
          <span>Sound</span>
          <input
            type="checkbox"
            role="switch"
            className="sound-switch"
            checked={soundOn}
            onChange={toggleSound}
          />
        </label>

        <label className="sound-row">
          <span>Music</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={musicVolume}
            onChange={onSlider(setMusicVolume)}
          />
        </label>

        <label className="sound-row">
          <span>Sounds</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={soundsVolume}
            onChange={onSlider(setSoundsVolume)}
          />
        </label>
      </div>
    </div>
  );
}
