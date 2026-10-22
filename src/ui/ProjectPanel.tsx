import { Suspense, useEffect } from 'react';
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

  const { meta, Showcase } = project;

  return (
    // clicking the dimmed backdrop closes the panel
    <div className="panel-backdrop" onClick={closeProject}>
      <article
        className={Showcase ? 'project-panel has-showcase' : 'project-panel'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="panel-close" onClick={closeProject} aria-label="Close">
          ×
        </button>

        <p className="panel-year">{meta.year}</p>
        <h2>{meta.title}</h2>
        <p>{meta.summary}</p>

        <ul className="panel-tech">
          {meta.tech.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>

        <div className="panel-links">
          {meta.links.github && (
            <a href={meta.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          )}
          {meta.links.demo && (
            <a href={meta.links.demo} target="_blank" rel="noreferrer">
              Live demo
            </a>
          )}
        </div>

        {Showcase && (
          <section className="panel-showcase">
            {/* shown while the showcase code is being downloaded */}
            <Suspense fallback={<p className="panel-loading">Loading…</p>}>
              <Showcase />
            </Suspense>
          </section>
        )}
      </article>
    </div>
  );
}
