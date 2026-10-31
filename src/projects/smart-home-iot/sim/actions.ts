import type { DeviceId } from './devices';
import type { HomeEngine } from './engine';
import { createRandom } from './random';
import { DayBuilder, type PlannedEvent, type WebRequest } from './schedule';

// What a visitor can do in the house. Each action is turned into the
// readings the devices would send, exactly like the simulated residents'
// (schedule.ts), so the same rules react to it.

function plan(engine: HomeEngine, build: (day: DayBuilder) => void): PlannedEvent[] {
  const day = new DayBuilder(engine.now, createRandom(engine.now));
  build(day);
  return day.build();
}

export const visitor = {
  walkIn(engine: HomeEngine, door: 1 | 2) {
    engine.perform(plan(engine, (day) => day.enter(0.1, door, `You walk in through door ${door}`)));
  },
  walkOut(engine: HomeEngine, door: 1 | 2) {
    engine.perform(
      plan(engine, (day) => day.leave(0.1, door, `You walk out through door ${door}`)),
    );
  },
  toggleDoor(engine: HomeEngine, door: 1 | 2) {
    const contact = door === 1 ? 'DS1' : 'DS2';
    const open = engine.doors[contact] === 0;
    engine.perform(
      plan(engine, (day) =>
        day.reading(
          0,
          contact,
          'Door_Status',
          open ? 1 : 0,
          open ? `You open door ${door}` : undefined,
        ),
      ),
    );
  },
  motion(engine: HomeEngine, device: Extract<DeviceId, 'DPIR1' | 'DPIR2' | 'DPIR3'>) {
    engine.perform(plan(engine, (day) => day.reading(0, device, 'Motion', 1)));
  },
  key(engine: HomeEngine, key: string) {
    engine.perform(plan(engine, (day) => day.reading(0, 'DMS', 'Key_Pressed', key)));
  },
  button(engine: HomeEngine) {
    engine.perform(plan(engine, (day) => day.reading(0, 'BTN', 'Button_Pressed', 1)));
  },
  remote(engine: HomeEngine, key: string) {
    engine.perform(plan(engine, (day) => day.remote(0, key)));
  },
  bumpIcon(engine: HomeEngine) {
    engine.perform(
      plan(engine, (day) =>
        day.reading(
          0,
          'GSG',
          'Acceleration',
          '[1.18, 0.22, 0.94]',
          'You bump the icon on the wall',
        ),
      ),
    );
  },
  web(engine: HomeEngine, request: WebRequest) {
    engine.perform([{ at: engine.now, action: { type: 'web', request } }]);
  },
};
