import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { KIND_LABELS } from '../projects/kinds';
import { projects } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';
import { ProjectIcon } from './ProjectIcon';

// "Projects" button (in the top bar) with a list of all projects, for
// visitors who don't want to walk: picking one teleports the fox to that
// station, the camera flies there, and the project's panel opens.

// time for the camera to fly to the station before the panel opens
const OPEN_DELAY_MS = 900;

export function ProjectsMenu() {
  const [open, setOpen] = useState(false);
  const nearbyProject = useGameStore((s) => s.nearbyProject);
  const travelTo = useGameStore((s) => s.travelTo);
  const showProject = useGameStore((s) => s.showProject);
  const menu = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);

  // close the list with Escape or a click anywhere outside it
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // a panel opening later must not happen after the page has gone
  useEffect(() => () => clearTimeout(openTimer.current), []);

  const goTo = (slug: string) => {
    setOpen(false);
    travelTo(slug);
    clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => showProject(slug), OPEN_DELAY_MS);
  };

  return (
    <div ref={menu} className="projects-menu">
      <button
        className="projects-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="projects-list"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {/* map pin */}
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.3" />
        </svg>
        Projects
      </button>

      <nav id="projects-list" className="projects-list" data-open={open} inert={!open}>
        <p className="projects-list-title">Jump to a project</p>
        <ul>
          {projects.map(({ meta }) => (
            <li key={meta.slug}>
              <button
                className="projects-item"
                data-current={meta.slug === nearbyProject}
                // the project's color is available to the CSS as var(--accent)
                style={{ '--accent': meta.accent } as CSSProperties}
                onClick={() => goTo(meta.slug)}
              >
                <span className="projects-item-icon">
                  <ProjectIcon name={meta.icon ?? meta.kind} />
                </span>
                <span className="projects-item-text">
                  <span className="projects-item-title">{meta.title}</span>
                  <span className="projects-item-kind">
                    {KIND_LABELS[meta.kind]} · {meta.year}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
