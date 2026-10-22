import { useEffect } from 'react';
import { getProject } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';

export function ProjectPanel() {
  const openProject = useGameStore((s) => s.openProject);
  const closeProject = useGameStore((s) => s.closeProject);

  // close the panel with Escape
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProject();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeProject]);

  const project = openProject ? getProject(openProject) : undefined;
  if (!project) return null;

  return (
    // clicking the dimmed backdrop closes the panel
    <div className="panel-backdrop" onClick={closeProject}>
      <article className="project-panel" onClick={(event) => event.stopPropagation()}>
        <button className="panel-close" onClick={closeProject} aria-label="Close">
          ×
        </button>

        <p className="panel-year">{project.year}</p>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>

        <ul className="panel-tech">
          {project.tech.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>

        <div className="panel-links">
          {project.links.github && (
            <a href={project.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          )}
          {project.links.demo && (
            <a href={project.links.demo} target="_blank" rel="noreferrer">
              Live demo
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
