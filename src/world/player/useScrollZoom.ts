import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';

const ZOOM_SPEED = 0.0012; // zoom change per pixel scrolled
const PIXELS_PER_LINE = 33; // some mice report scrolling in lines instead of pixels

// zoom level chosen with the mouse wheel, from 0 (close-up) to 1 (overview);
// returned as a ref because it is read every frame, not rendered
export function useScrollZoom(initial: number) {
  const zoom = useRef(initial);
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      // keep the page from scrolling and the browser from zooming (ctrl + wheel
      // and touchpad pinch also arrive as wheel events)
      event.preventDefault();
      if (useGameStore.getState().openProject) return;

      const pixels = event.deltaMode === 1 ? event.deltaY * PIXELS_PER_LINE : event.deltaY;
      zoom.current = Math.min(1, Math.max(0, zoom.current + pixels * ZOOM_SPEED));
    };

    // passive: false is required for preventDefault to work on wheel events
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvas]);

  return zoom;
}
