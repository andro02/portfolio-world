import type { DeviceId, DhtId } from './devices';
import { createRandom, hashString, type Random } from './random';
import { dayKey, startOfNextDay } from './time';

// A simulated day in the house: two residents, Mila and Luka, go to work,
// come home, cook, take out the trash and switch the bedroom light with the
// remote; now and then something sets off the alarm. Each day is generated
// from its date, so every visitor sees the same day and nothing is stored.
//
// The plan only contains what the devices would report (and what someone does
// on the web dashboard); everything the system does about it - counting
// people, lights, the alarm - is worked out by the engine, from the same
// rules as server.py.

export type WebRequest =
  | { path: '/api/rgb'; color: string }
  | { path: '/api/stopwatch'; action: 'set_time'; time: number }
  | { path: '/api/stopwatch'; action: 'set_n'; n: number }
  | { path: '/api/alarm/deactivate'; pin: string };

export type PlannedAction =
  // a reading a sensor publishes over MQTT
  | { type: 'reading'; device: DeviceId; measurement: string; value: number | string }
  // the periodic temperature and humidity reading of a DHT sensor (the values
  // come from sensors.ts, at the moment of the reading)
  | { type: 'dht'; device: DhtId }
  // a request from the web dashboard to the Flask server
  | { type: 'web'; request: WebRequest };

export interface PlannedEvent {
  at: number; // ms since epoch
  action: PlannedAction;
  story?: string; // what is happening, shown in the log
}

// a period that warms up and humidifies a room (cooking, a shower)
export interface RoomActivity {
  device: DhtId;
  from: number;
  to: number;
  heat: number; // °C at its peak
  humidity: number; // percentage points at its peak
}

export interface DayPlan {
  key: string;
  start: number;
  end: number;
  events: PlannedEvent[];
  activities: RoomActivity[];
}

export const SECRET_PIN = '1111';

// how often each DHT sensor reports (the real ones every few seconds; less
// here, to keep the log readable)
const DHT_EVERY = 300; // seconds

type DoorNo = 1 | 2;
const DOOR = {
  1: { contact: 'DS1', distance: 'DUS1', motion: 'DPIR1' },
  2: { contact: 'DS2', distance: 'DUS2', motion: 'DPIR2' },
} as const;

export class DayBuilder {
  readonly events: PlannedEvent[] = [];
  readonly activities: RoomActivity[] = [];
  // times (seconds of the day) when someone passes each door; other motion
  // near those times would confuse the people counter, as in reality
  private readonly doorPasses: Record<DoorNo, number[]> = { 1: [], 2: [] };
  private readonly ambientMotion: { device: 'DPIR2' | 'DPIR3'; second: number }[] = [];

  private readonly start: number;
  readonly random: Random;

  constructor(start: number, random: Random) {
    this.start = start;
    this.random = random;
  }

  private push(second: number, action: PlannedAction, story?: string) {
    this.events.push({ at: this.start + Math.round(second * 1000), action, story });
  }

  reading(
    second: number,
    device: DeviceId,
    measurement: string,
    value: number | string,
    story?: string,
  ) {
    this.push(second, { type: 'reading', device, measurement, value }, story);
  }

  web(second: number, request: WebRequest, story?: string) {
    this.push(second, { type: 'web', request }, story);
  }

  dhtReadings() {
    (['DHT1', 'DHT2', 'DHT3'] as const).forEach((device, index) => {
      for (let second = 20 * index + 30; second < 24 * 3600; second += DHT_EVERY) {
        this.push(second, { type: 'dht', device });
      }
    });
  }

  typePin(second: number, pin: string, story?: string) {
    [...pin].forEach((key, index) => {
      this.reading(
        second + index * 0.6,
        'DMS',
        'Key_Pressed',
        key,
        index === 0 ? story : undefined,
      );
    });
  }

  // Someone goes out: motion inside, the door opens, the distance sensor
  // outside sees them, the door closes. With arm, they first type the PIN on
  // the keypad, which arms the alarm 10 s later (only the front door has one).
  leave(second: number, door: DoorNo, story: string, arm = false) {
    const { contact, distance, motion } = DOOR[door];
    if (arm) this.typePin(second - 6, SECRET_PIN, story);
    this.reading(second, motion, 'Motion', 1, arm ? undefined : story);
    this.reading(second + 1.5, contact, 'Door_Status', 1);
    this.reading(second + 3, distance, 'Distance', this.random.int(24, 41));
    this.reading(second + 4.5, contact, 'Door_Status', 0);
    this.doorPasses[door].push(second);
  }

  // Someone comes in: seen outside first, then the door opens and the motion
  // sensor inside sees them. If the alarm is armed, they have 10 s for the
  // PIN: on the keypad at the front door, from the phone (the dashboard) at
  // the back.
  enter(
    second: number,
    door: DoorNo,
    story: string,
    options: { armed?: boolean; wrongPinFirst?: boolean; openFor?: number } = {},
  ) {
    const { contact, distance, motion } = DOOR[door];
    const openFor = options.openFor ?? 2.5;
    this.reading(second, distance, 'Distance', this.random.int(22, 40), story);
    this.reading(second + 1, contact, 'Door_Status', 1);
    this.reading(second + 2.5, motion, 'Motion', 1);
    this.reading(second + 1 + openFor, contact, 'Door_Status', 0);
    if (options.armed) {
      if (door === 2) {
        this.web(second + 6, { path: '/api/alarm/deactivate', pin: SECRET_PIN });
      } else if (options.wrongPinFirst) {
        this.typePin(second + 4, '1121', 'A wrong PIN first…');
        this.typePin(second + 7.4, SECRET_PIN);
      } else {
        this.typePin(second + 4, SECRET_PIN);
      }
    }
    this.doorPasses[door].push(second);
  }

  // occasional motion in a room while someone is there
  motion(device: 'DPIR2' | 'DPIR3', from: number, to: number, minGap: number, maxGap: number) {
    for (let second = from + this.random.between(0, minGap); second < to;) {
      this.ambientMotion.push({ device, second });
      second += this.random.between(minGap, maxGap);
    }
  }

  kitchenTimer(second: number, seconds: number, story: string): number {
    this.web(second, { path: '/api/stopwatch', action: 'set_time', time: seconds }, story);
    const end = second + seconds;
    // when it runs out it blinks until someone presses the button
    this.reading(end + this.random.between(6, 50), 'BTN', 'Button_Pressed', 1);
    return end;
  }

  remote(second: number, key: string, story?: string) {
    this.reading(second, 'IR', 'IR_Remote', key, story);
  }

  activity(device: DhtId, from: number, to: number, heat: number, humidity: number) {
    this.activities.push({
      device,
      from: this.start + from * 1000,
      to: this.start + to * 1000,
      heat,
      humidity,
    });
  }

  build(): PlannedEvent[] {
    for (const { device, second } of this.ambientMotion) {
      // the back door's motion sensor is in the kitchen; motion close to
      // someone using that door would be taken for them coming in or going
      // out, so the plan leaves it out (as in reality, the counter would err)
      if (device === 'DPIR2' && this.doorPasses[2].some((pass) => Math.abs(second - pass) < 14)) {
        continue;
      }
      this.reading(second, device, 'Motion', 1);
    }
    return this.events.sort((a, b) => a.at - b.at);
  }
}

const h = (hours: number, minutes = 0) => hours * 3600 + minutes * 60;

function weekday(day: DayBuilder) {
  const { random } = day;

  // morning
  const wake = random.between(h(6, 10), h(6, 40));
  day.activity('DHT2', wake + 300, wake + 1500, 0.6, 14); // shower next door
  day.motion('DPIR3', wake + 600, h(7, 25), 120, 420);
  const breakfast = wake + random.between(900, 1500);
  day.kitchenTimer(
    breakfast,
    random.pick([180, 240, 300, 360]),
    'Breakfast: kitchen timer set from the dashboard',
  );
  day.activity('DHT3', breakfast - 300, breakfast + 1200, 1.2, 8);
  day.motion('DPIR2', breakfast - 300, breakfast + 900, 60, 240);

  const lukaLeaves = random.between(h(7, 35), h(8, 0));
  day.leave(lukaLeaves, 1, 'Luka leaves for work');
  const milaLeaves = random.between(h(8, 20), h(8, 55));
  day.leave(milaLeaves, 1, 'Mila leaves last and arms the alarm with the PIN', true);

  // the house is empty and armed until Mila is back
  const milaBack = random.between(h(15, 30), h(16, 40));
  day.enter(milaBack, 1, 'Mila is home: the alarm is armed, so the PIN has to follow within 10 s', {
    armed: true,
    wrongPinFirst: random.chance(0.25),
  });
  day.motion('DPIR3', milaBack + 120, h(17, 50), 240, 900);

  const lukaBack = random.between(h(17, 5), h(18, 10));
  if (random.chance(0.5)) {
    const groceries = random.chance(0.45);
    day.enter(
      lukaBack,
      2,
      groceries
        ? 'Luka carries in groceries through the back door and leaves it open'
        : 'Luka comes in through the back door',
      { openFor: groceries ? random.between(9, 16) : 2.5 },
    );
  } else {
    day.enter(lukaBack, 1, 'Luka is home');
  }

  evening(day);
}

function weekend(day: DayBuilder, saturday: boolean) {
  const { random } = day;
  const wake = random.between(h(8, 0), h(9, 20));
  day.activity('DHT2', wake + 600, wake + 1800, 0.6, 14);
  day.motion('DPIR3', wake + 300, h(10, 50), 150, 600);
  const breakfast = wake + random.between(1200, 2400);
  day.kitchenTimer(
    breakfast,
    random.pick([300, 420, 540]),
    'Pancakes: kitchen timer set from the dashboard',
  );
  day.activity('DHT3', breakfast - 600, breakfast + 1500, 1.6, 10);
  day.motion('DPIR2', breakfast - 600, breakfast + 1200, 60, 240);

  if (saturday && random.chance(0.6)) {
    // cleaning: the icon on the wall gets bumped
    const bump = random.between(h(10, 0), h(10, 45));
    const axes = [random.between(0.9, 1.3), random.between(-0.4, 0.4), random.between(0.8, 1.0)];
    day.reading(
      bump,
      'GSG',
      'Acceleration',
      `[${axes.map((axis) => axis.toFixed(2)).join(', ')}]`,
      'Cleaning: the icon on the wall gets bumped',
    );
    day.typePin(
      bump + random.between(14, 35),
      SECRET_PIN,
      'Mila turns the alarm off at the keypad',
    );
  }

  if (random.chance(0.75)) {
    // out together
    const out = random.between(h(11, 0), h(11, 50));
    day.leave(out, 1, 'Luka heads out');
    day.leave(out + random.between(15, 45), 1, 'Mila follows and arms the alarm', true);
    const back = random.between(h(13, 40), h(15, 30));
    day.enter(back, 1, 'Back home: Mila enters the PIN', {
      armed: true,
      wrongPinFirst: random.chance(0.2),
    });
    day.enter(back + random.between(14, 30), 1, 'Luka comes in after her');
    day.motion('DPIR3', back + 200, h(18, 30), 200, 800);
  } else {
    day.motion('DPIR3', h(11, 0), h(18, 30), 200, 800);
  }

  evening(day);
}

function evening(day: DayBuilder) {
  const { random } = day;

  // dinner
  const dinner = random.between(h(18, 35), h(19, 15));
  const cooking = random.pick([900, 1200, 1500, 1800]);
  day.kitchenTimer(dinner, cooking, 'Dinner: the oven timer is set from the dashboard');
  if (random.chance(0.5)) {
    // a little longer, from the button (adds N seconds each press)
    const press = dinner + cooking - random.between(60, 200);
    day.reading(press, 'BTN', 'Button_Pressed', 1, 'A few more seconds with the kitchen button');
    day.reading(press + 0.8, 'BTN', 'Button_Pressed', 1);
  }
  day.activity('DHT3', dinner - 900, dinner + cooking + 600, 2.8, 18);
  day.motion('DPIR2', dinner - 900, dinner + cooking + 300, 45, 200);

  // the trash goes out through the back door
  if (random.chance(0.65)) {
    const out = dinner + cooking + random.between(1500, 2700);
    day.leave(out, 2, 'Luka takes out the trash');
    day.enter(out + random.between(70, 180), 2, 'Luka is back in');
  }

  day.motion('DPIR3', h(19, 50), h(22, 50), 150, 600);

  // the bedroom light, from the remote
  const reading = random.between(h(21, 20), h(22, 10));
  day.remote(
    reading,
    random.pick(['5', '6', '4']),
    'Evening light in the bedroom, from the remote',
  );
  if (random.chance(0.5))
    day.remote(reading + random.between(600, 1800), random.pick(['1', '7', '3']));
  day.remote(random.between(h(23, 5), h(23, 40)), '0', 'Lights out');

  // a glass of water at night
  if (random.chance(0.35)) {
    const night = random.between(h(1, 30), h(4, 50));
    day.reading(night, 'DPIR3', 'Motion', 1, 'Someone gets a glass of water');
    day.reading(night + random.between(40, 120), 'DPIR3', 'Motion', 1);
  }
}

const cache = new Map<number, DayPlan>();

export function planDay(dayStart: number): DayPlan {
  const cached = cache.get(dayStart);
  if (cached) return cached;

  const key = dayKey(dayStart);
  const day = new DayBuilder(dayStart, createRandom(hashString(key)));
  const weekdayIndex = new Date(dayStart).getDay();
  if (weekdayIndex === 0 || weekdayIndex === 6) weekend(day, weekdayIndex === 6);
  else weekday(day);
  day.dhtReadings();

  const plan: DayPlan = {
    key,
    start: dayStart,
    end: startOfNextDay(dayStart),
    events: day.build(),
    activities: day.activities,
  };
  cache.set(dayStart, plan);
  if (cache.size > 8) cache.delete(cache.keys().next().value!);
  return plan;
}
