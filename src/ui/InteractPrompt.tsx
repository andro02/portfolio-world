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

  // react to the moment E is pressed, not to it being held down
  useEffect(
    () =>
      subscribe(
        (state) => state.interact,
        (pressed) => {
          if (pressed) openNearbyProject();
        },
      ),
    [subscribe, openNearbyProject],
  );

  if (!nearbyProject || openProject) return null;

  const project = getProject(nearbyProject);

  return (
    <div className="interact-prompt">
      <kbd>E</kbd> Open {project?.title}
    </div>
  );
}
