import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../../store/useGameStore';

const ZOOM_SPEED = 0.0012; // zoom change per pixel scrolled
const PIXELS_PER_LINE = 33; // some mice report scrolling in lines instead of pixels

// changes the zoom level in the store with the mouse wheel
export function useScrollZoom() {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      // keep the page from scrolling and the browser from zooming (ctrl + wheel
      // and touchpad pinch also arrive as wheel events)
      event.preventDefault();

      const { openProject, zoom, setZoom } = useGameStore.getState();
      if (openProject) return;

      const pixels = event.deltaMode === 1 ? event.deltaY * PIXELS_PER_LINE : event.deltaY;
      setZoom(zoom + pixels * ZOOM_SPEED);
    };

    // passive: false is required for preventDefault to work on wheel events
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvas]);
}
