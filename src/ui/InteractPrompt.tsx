import { useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { getProject } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';
import type { Control } from '../world/player/controls';

export function InteractPrompt() {
  const [subscribe] = useKeyboardControls<Control>();
  const nearbyProject = useGameStore((s) => s.nearbyProject);
  const openProject = useGameStore((s) => s.openProject);
  const openNearbyProject = useGameStore((s) => s.openNearbyProject);

  // open on key release: by then the key press is over, so the "e" can't
  // end up typed into an input that the newly opened panel focuses
  useEffect(
    () =>
      subscribe(
        (state) => state.interact,
        (pressed) => {
          if (!pressed) openNearbyProject();
        },
      ),
    [subscribe, openNearbyProject],
  );

  if (!nearbyProject || openProject) return null;

  const project = getProject(nearbyProject);

  return (
    <div className="interact-prompt">
      <kbd>E</kbd> Open {project?.meta.title}
    </div>
  );
}
