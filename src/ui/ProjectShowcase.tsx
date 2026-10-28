import { useEffect, useState, type ComponentType } from 'react';
import { getLoadedShowcase, preloadShowcase } from '../projects/showcaseLoader';
import type { ProjectDefinition } from '../projects/types';

interface ProjectShowcaseProps {
  project: ProjectDefinition;
}

// shows the project's showcase; it is normally downloaded already (when the
// player walked up to the station), otherwise a placeholder of the same size
// keeps the panel from jumping while it arrives
export function ProjectShowcase({ project }: ProjectShowcaseProps) {
  const slug = project.meta.slug;
  const [Showcase, setShowcase] = useState<ComponentType | undefined>(() =>
    getLoadedShowcase(slug),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Showcase) return;

    let active = true; // ignore the result if the panel closed in the meantime
    preloadShowcase(project)
      ?.then((component) => {
        // a component is stored with the function form, otherwise React would
        // call it as an update function
        if (active) setShowcase(() => component);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [Showcase, project]);

  if (Showcase) return <Showcase />;

  return (
    <div className="showcase-placeholder">
      {failed ? 'Could not load the demo. Please check your connection.' : 'Loading…'}
    </div>
  );
}
