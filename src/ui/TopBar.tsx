import { useGameStore } from '../store/useGameStore';
import { ProjectsMenu } from './ProjectsMenu';
import { SoundToggle } from './SoundToggle';

// buttons in the top left corner; hidden while a project panel is open
export function TopBar() {
  const isPanelOpen = useGameStore((s) => s.openProject !== null);

  return (
    <div className="top-bar" data-hidden={isPanelOpen} inert={isPanelOpen}>
      <ProjectsMenu />
      <SoundToggle />
    </div>
  );
}
