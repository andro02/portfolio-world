import { useEffect, useState, type CSSProperties } from 'react';
import { KIND_LABELS } from '../projects/kinds';
import { getProject } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';
import { ProjectKindIcon } from './ProjectKindIcon';
import { ProjectShowcase } from './ProjectShowcase';

const CLOSE_ANIMATION_MS = 200; // keep in sync with the panel-out animation in ui.css

export function ProjectPanel() {
  const openProject = useGameStore((s) => s.openProject);
  const closeProject = useGameStore((s) => s.closeProject);

  // the project being shown; it stays set for a moment after closing, so the
  // panel can play its closing animation before it disappears
  const [shownProject, setShownProject] = useState(openProject);
  if (openProject && openProject !== shownProject) setShownProject(openProject);
  const closing = !openProject && shownProject !== null;

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setShownProject(null), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  // close the panel with Escape
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeProject();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeProject]);

  const project = shownProject ? getProject(shownProject) : undefined;
  if (!project) return null;

  const { meta } = project;
  const hasShowcase = Boolean(project.loadShowcase);
  const { github, demo } = meta.links;

  return (
    // clicking the dimmed backdrop closes the panel
    <div
      className="sheet-backdrop"
      data-state={closing ? 'closing' : 'open'}
      inert={closing}
      onClick={closeProject}
    >
      <article
        className="sheet"
        data-showcase={hasShowcase}
        // the project's color is available to the CSS as var(--accent)
        style={{ '--accent': meta.accent } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
        aria-label={meta.title}
      >
        <header className="sheet-header">
          <div className="sheet-icon">
            <ProjectKindIcon kind={meta.kind} />
          </div>
          <div className="sheet-heading">
            <p className="sheet-kind">
              {KIND_LABELS[meta.kind]} · {meta.year}
            </p>
            <h2>{meta.title}</h2>
          </div>
          <button className="sheet-close" onClick={closeProject} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="sheet-body">
          <section className="sheet-info">
            <p className="sheet-summary">{meta.summary}</p>

            {meta.highlights && (
              <>
                <h3>Features</h3>
                <ul className="sheet-features">
                  {meta.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </>
            )}

            <h3>Tech</h3>
            <ul className="sheet-tech">
              {meta.tech.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>

            {(github || demo) && (
              <div className="sheet-links">
                {github && (
                  <a className="sheet-button" href={github} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {/* code brackets */}
                      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
                    </svg>
                    View code
                  </a>
                )}
                {demo && (
                  <a
                    className="sheet-button secondary"
                    href={demo}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {/* arrow out of a box */}
                      <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
                    </svg>
                    Live demo
                  </a>
                )}
              </div>
            )}
          </section>

          {hasShowcase && (
            <section className="sheet-showcase">
              <ProjectShowcase key={meta.slug} project={project} />
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
