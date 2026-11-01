import { RGB_CSS } from './devices';
import { HomeEngine } from './engine';
import { hourOfDay } from './time';

// The one simulated house of the page, shared by the panel (Showcase.tsx) and
// the house on the island (StationModel.tsx), so both always show the same
// thing: open the front door in the panel, and the island's door light
// switches on too.
//
// Its clock: at real time `real` (performance.now()) the simulation was at
// `sim`, and it runs `speed` times faster than real time from there.

let engine: HomeEngine | null = null;
let clock = { sim: 0, real: 0, speed: 1 };
let lastTarget = 0;

// the house, replayed from midnight up to now the first time it is asked for
export function getLiveHome(): HomeEngine {
  return engine ?? restartLiveHome();
}

// a fresh house at the real time, at normal speed (what the visitor did is
// forgotten: the past can't be changed afterwards)
export function restartLiveHome(): HomeEngine {
  engine = new HomeEngine(Date.now());
  clock = { sim: engine.now, real: performance.now(), speed: 1 };
  lastTarget = engine.now;
  return engine;
}

// moves the simulation to the clock's current time; called by whoever draws
// the house, as often as it draws it
export function advanceLiveHome(real = performance.now()) {
  const home = getLiveHome();
  const target = clock.sim + (real - clock.real) * clock.speed;
  if (target <= home.now) return;
  home.advanceTo(target, real, lastTarget);
  lastTarget = target;
}

export function getLiveSpeed(): number {
  return clock.speed;
}

// runs on from where the simulation is now, at this speed (also after a jump)
export function setLiveSpeed(speed: number) {
  const home = getLiveHome();
  clock = { sim: home.now, real: performance.now(), speed };
  lastTarget = home.now;
}

// true while the simulation follows the real clock
export function isLiveHomeOnTime(): boolean {
  return clock.speed === 1 && Math.abs(getLiveHome().now - Date.now()) < 5000;
}

// what the house on the island shows (StationModel.tsx)
export interface IslandView {
  livingRoom: boolean; // the front window
  kitchen: boolean; // the side window
  bedroom: string | null; // the back window: the RGB light's color, if on
  doorLight: boolean;
  alarm: boolean;
}

export function getIslandView(): IslandView {
  const home = getLiveHome();
  const hour = hourOfDay(home.now);
  const dark = hour < 7.5 || hour >= 17;
  const movedWithin = (device: 'DPIR2' | 'DPIR3', minutes: number) => {
    const seen = home.lastSeen.get(device);
    return Boolean(seen && home.now - seen.at < minutes * 60_000);
  };
  const cooking = home.stopwatchRunning || home.stopwatchBlinking;
  return {
    // evenings while someone is home, and at night when someone gets up
    livingRoom:
      dark && home.peopleCount > 0 && ((hour >= 17 && hour < 23.5) || movedWithin('DPIR3', 10)),
    kitchen: (dark || cooking) && home.peopleCount > 0 && (cooking || movedWithin('DPIR2', 10)),
    bedroom: home.rgb === 'off' ? null : (RGB_CSS[home.rgb] ?? null),
    doorLight: home.doorLight,
    alarm: home.alarmActive,
  };
}
