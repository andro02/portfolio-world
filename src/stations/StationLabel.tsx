import { Html } from '@react-three/drei';
import type { ProjectKind, ProjectMeta } from '../projects/types';

// short name of each kind of project, shown above the title
const KIND_LABELS: Record<ProjectKind, string> = {
  web: 'Web app',
  console: 'Systems',
  iot: 'IoT',
  ml: 'Machine learning',
  backend: 'Cloud backend',
};

interface StationLabelProps {
  meta: ProjectMeta;
  height: number; // height above the ground where the label's pointer ends
  highlighted: boolean;
}

// floating name tag above a station; it is regular HTML that follows the 3D
// position, so the text stays sharp and uses the same styles as the rest of the UI
export function StationLabel({ meta, height, highlighted }: StationLabelProps) {
  return (
    <Html
      position={[0, height, 0]}
      // keeps labels below the HTML interface (panel, legend, buttons)
      zIndexRange={[1, 0]}
      // the label never catches the mouse, so scrolling over it still zooms
      pointerEvents="none"
    >
      <div className="station-label" data-highlighted={highlighted}>
        <span className="station-label-kind">{KIND_LABELS[meta.kind]}</span>
        <span className="station-label-title">{meta.title}</span>
      </div>
    </Html>
  );
}
