import { useEffect, useState, type CSSProperties } from 'react';
import { KIND_LABELS } from '../projects/kinds';
import { getProject } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';
import { ProjectIcon } from './ProjectIcon';
import { ProjectShowcase } from './ProjectShowcase';

// arrow leaving a box: the link opens another website in a new tab
function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
    </svg>
  );
}

// last part of a repository link, e.g. "nosql-storage-engine"
function repositoryName(url: string | undefined): string | undefined {
  return url?.split('/').filter(Boolean).pop();
}

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

  // close the panel with Escape (unless a demo is in full screen: there,
  // Escape belongs to the browser, which leaves full screen with it)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) closeProject();
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
        // decorative theme of the panel, styled in ui.css (sheet themes)
        data-theme={meta.theme}
        // the project's color is available to the CSS as var(--accent)
        style={{ '--accent': meta.accent } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
        aria-label={meta.title}
      >
        {meta.theme === 'terminal' && (
          // title bar of a terminal window
          <div className="sheet-titlebar" aria-hidden="true">
            <span className="sheet-titlebar-dots">
              <i />
              <i />
              <i />
            </span>
            <span>~/{repositoryName(meta.links.github) ?? meta.slug}</span>
          </div>
        )}

        <header className="sheet-header">
          <div className="sheet-icon">
            <ProjectIcon name={meta.icon ?? meta.kind} />
            {meta.theme === 'detection' && (
              // frame and label like an object found by the detection model
              <span className="sheet-detection" aria-hidden="true">
                <span className="sheet-detection-label">landfill 0.94</span>
              </span>
            )}
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
                    View on GitHub
                    <ExternalLinkIcon />
                  </a>
                )}
                {demo && (
                  <a
                    className="sheet-button secondary"
                    href={demo}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Live demo
                    <ExternalLinkIcon />
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
