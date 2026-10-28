import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';

const PINCH_SPEED = 0.003; // zoom change per pixel the fingers move apart or together

// changes the zoom level in the store when two fingers pinch on the canvas:
// moving them apart zooms in, moving them together zooms out
export function usePinchZoom() {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    // fingers currently on the canvas, by pointer id
    const fingers = new Map<number, { x: number; y: number }>();
    let previousDistance: number | null = null;

    const distanceBetweenFingers = () => {
      const [a, b] = [...fingers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') return;
      fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      previousDistance = fingers.size === 2 ? distanceBetweenFingers() : null;
    };

    const onMove = (event: PointerEvent) => {
      if (!fingers.has(event.pointerId)) return;
      fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (fingers.size !== 2 || previousDistance === null) return;

      const distance = distanceBetweenFingers();
      const { openProject, zoom, setZoom } = useGameStore.getState();
      if (!openProject) setZoom(zoom - (distance - previousDistance) * PINCH_SPEED);
      previousDistance = distance;
    };

    const onUp = (event: PointerEvent) => {
      fingers.delete(event.pointerId);
      previousDistance = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [canvas]);
}
