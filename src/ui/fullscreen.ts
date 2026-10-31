import { useEffect, useRef, useState } from 'react';

// Showing one element over the whole screen (the Fullscreen API), shared by
// the live demos and the smart home showcase.

// Safari before 16.4 only has the prefixed versions of the fullscreen API
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

// true if the browser can show an element over the whole screen (iPhones can't)
function canGoFullscreen(element: FullscreenElement) {
  return Boolean(element.requestFullscreen ?? element.webkitRequestFullscreen);
}

function enterFullscreen(element: FullscreenElement) {
  if (element.requestFullscreen) void element.requestFullscreen();
  else element.webkitRequestFullscreen?.();
}

function exitFullscreen() {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) void doc.exitFullscreen();
  else doc.webkitExitFullscreen?.();
}

// Put `ref` on the element; `toggle` enters or leaves full screen and returns
// false where the browser has no fullscreen API (`supported` says so ahead).
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);
  const [supported] = useState(() => canGoFullscreen(document.documentElement));

  // follow full screen however it ends (the button, or the browser's Escape)
  useEffect(() => {
    const onChange = () => setActive(ref.current !== null && fullscreenElement() === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggle = (): boolean => {
    const element = ref.current;
    if (!element) return false;
    if (active) {
      exitFullscreen();
      return true;
    }
    if (!canGoFullscreen(element)) return false;
    enterFullscreen(element);
    return true;
  };

  return { ref, active, supported, toggle };
}
