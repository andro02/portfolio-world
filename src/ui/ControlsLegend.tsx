import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

interface Row {
  keys: string[][]; // alternative sets of keys, e.g. [['Scroll'], ['+', '−']]
  action: string;
}

const ROWS: Row[] = [
  { keys: [['W', 'A', 'S', 'D'], ['← ↑ ↓ →']], action: 'Move' }, // arrows share one key cap
  { keys: [['Space']], action: 'Jump' },
  { keys: [['E']], action: 'Open project' },
  { keys: [['Scroll'], ['+', '−']], action: 'Zoom' },
  { keys: [['R']], action: 'Reset zoom' },
  { keys: [['M']], action: 'Sound on / off' },
  { keys: [['Esc']], action: 'Close project' },
];

const STORAGE_KEY = 'controls-legend-open';

// whether the legend was left open or closed on the previous visit; storage can
// be unavailable (private mode, blocked cookies), so it falls back to open
function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(open));
  } catch {
    // nothing to do, the choice just isn't remembered
  }
}

export function ControlsLegend() {
  const [open, setOpen] = useState(readOpen);
  const isPanelOpen = useGameStore((s) => s.openProject !== null);

  const toggle = () => {
    setOpen(!open);
    saveOpen(!open);
  };

  // both the legend and the small toggle button stay in the page, so CSS can
  // animate one into the other; the hidden one is made inert (not clickable,
  // not reachable with Tab)
  return (
    <div className="controls" data-hidden={isPanelOpen}>
      <aside className="controls-legend" data-open={open} inert={!open} aria-label="Controls">
        <header>
          <h3>Controls</h3>
          <button onClick={toggle} aria-label="Hide controls">
            ×
          </button>
        </header>

        <dl>
          {ROWS.map(({ keys, action }) => (
            <div key={action} className="legend-row">
              <dt>
                {keys.map((combo, index) => (
                  <span key={index} className="legend-combo">
                    {index > 0 && <span className="legend-or">or</span>}
                    {combo.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                ))}
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <button className="legend-toggle" data-open={!open} inert={open} onClick={toggle}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {/* keyboard */}
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
        </svg>
        Controls
      </button>
    </div>
  );
}
