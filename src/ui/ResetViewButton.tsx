import { useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_ZOOM } from '../world/player/cameraZoom';
import type { Control } from '../world/player/controls';

// button (and the R key) that brings the camera back to the default zoom; it
// slides in only while the camera is zoomed in or out
export function ResetViewButton() {
  const [subscribe] = useKeyboardControls<Control>();
  const resetZoom = useGameStore((s) => s.resetZoom);
  const isPanelOpen = useGameStore((s) => s.openProject !== null);
  // re-renders only when this flips, not on every small zoom change
  const isZoomed = useGameStore((s) => Math.abs(s.zoom - DEFAULT_ZOOM) > 0.01);

  useEffect(
    () =>
      subscribe(
        (state) => state.resetView,
        (pressed) => {
          // R may be typed into a project's terminal, so not while a panel is open
          if (pressed && !useGameStore.getState().openProject) resetZoom();
        },
      ),
    [subscribe, resetZoom],
  );

  const visible = isZoomed && !isPanelOpen;

  return (
    <button
      className="reset-view"
      data-visible={visible}
      // hidden buttons can't be clicked or reached with Tab
      inert={!visible}
      onClick={resetZoom}
      title="Reset zoom (R)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* magnifying glass with a small "back" arrow inside */}
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 20 20" />
        <path d="M8 10.5a2.5 2.5 0 1 0 .7-1.75" />
        <path d="M8.3 7.4v1.6h1.6" />
      </svg>
      Reset zoom
    </button>
  );
}
