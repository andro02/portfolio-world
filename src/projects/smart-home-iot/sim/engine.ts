import { DEVICES, IR_COLORS, type DeviceId, type DhtId, type PiId } from './devices';
import { idleDistance, readClimate } from './sensors';
import {
  SECRET_PIN,
  planDay,
  type PlannedAction,
  type PlannedEvent,
  type WebRequest,
} from './schedule';
import { startOfDay } from './time';

// The project's server (server/server.py) ported to TypeScript: the same
// state machine and the same rules, fed by the simulated devices instead of
// MQTT, with the Raspberry Pis' side (actuators answering commands) built in.
//
// Time is simulated: everything that happens is an item in a queue, ordered by
// time, and advanceTo() works through the queue up to a moment. Timers that
// the Python code starts with threading.Timer are queue items too, so a day
// can be replayed in milliseconds and then continue in real time.

export type Security = 'disarmed' | 'arming' | 'armed' | 'alarm';

export type LogKind = 'story' | 'sensor' | 'command' | 'actuator' | 'web' | 'server';

export interface LogEntry {
  id: number;
  at: number;
  kind: LogKind;
  source: PiId | 'server' | 'web' | 'story';
  topic?: string;
  text: string;
}

export interface HistoryPoint {
  at: number;
  people: number;
  security: Security;
}

interface Timer {
  cancelled: boolean;
}

interface QueueItem {
  at: number;
  order: number;
  run: () => void;
}

// a binary heap: the earliest item first, equal times in insertion order
class Queue {
  private items: QueueItem[] = [];
  private counter = 0;

  push(at: number, run: () => void) {
    const item = { at, order: this.counter++, run };
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (!this.before(items[index], items[parent])) break;
      [items[index], items[parent]] = [items[parent], items[index]];
      index = parent;
    }
  }

  peek(): QueueItem | undefined {
    return this.items[0];
  }

  pop(): QueueItem | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < items.length && this.before(items[left], items[smallest])) smallest = left;
        if (right < items.length && this.before(items[right], items[smallest])) smallest = right;
        if (smallest === index) break;
        [items[index], items[smallest]] = [items[smallest], items[index]];
        index = smallest;
      }
    }
    return top;
  }

  private before(a: QueueItem, b: QueueItem) {
    return a.at < b.at || (a.at === b.at && a.order < b.order);
  }
}

const LOG_SIZE = 400;

// JSON with a space after each separator, so it wraps between fields
const json = (value: object) =>
  JSON.stringify(value)
    .replace(/,(?=")/g, ', ')
    .replace(/":/g, '": ');
const DISTANCE_THRESHOLD = 50; // cm: closer than this, someone is at the door
const TIME_WINDOW = 5000; // ms between the distance and the motion sensor

type DoorSensor = 'DS1' | 'DS2';

export class HomeEngine {
  now: number;
  private readonly queue = new Queue();
  private nextDayToLoad: number;
  private nextLogId = 1;

  // --- SYSTEM_STATE of server.py ---
  alarmActive = false;
  securityArmed = false;
  alarmReason = '';
  peopleCount = 2; // the day starts at midnight with both residents at home
  private doorOpenTimers = new Map<DoorSensor, Timer>();
  pinBuffer = '';
  private lastDus = { 1: -Infinity, 2: -Infinity };
  private lastDpir = { 1: -Infinity, 2: -Infinity };
  private cooldowns = { 1: -Infinity, 2: -Infinity };
  private pinClearTimer: Timer | null = null;
  private intrusionTimer: Timer | null = null;
  private dlTimer: Timer | null = null;
  dhtReadings = new Map<string, { temp: number; hum: number }>();
  stopwatchTime = 0;
  stopwatchRunning = false;
  stopwatchBlinking = false;
  btnAddSeconds = 10;

  // --- what the devices show (the Raspberry Pis' side) ---
  doors: Record<DoorSensor, 0 | 1> = { DS1: 0, DS2: 0 };
  doorLight = false;
  buzzer = false;
  rgb = 'off';
  armingUntil = -Infinity; // the PIN was entered, the alarm arms at this time
  intrusionUntil = -Infinity; // someone came in while armed: PIN until then
  // when each device last reported, in simulated and in real time (for
  // short animations that should look the same at any speed)
  readonly lastSeen = new Map<DeviceId, { at: number; real: number; value: number | string }>();

  readonly log: LogEntry[] = [];
  readonly history: HistoryPoint[] = [];
  // how many points server.py would have written to InfluxDB today (no
  // database runs here; it is only counted)
  pointsToday = 0;

  // real time (performance.now()) while running live, so the UI can animate
  // what just happened; -Infinity while replaying the past
  private realNow = -Infinity;

  constructor(start: number) {
    const dayStart = startOfDay(start);
    this.now = dayStart;
    this.nextDayToLoad = dayStart;
    this.recordHistory();
    this.advanceTo(start);
  }

  // --- running the simulation ---

  // Works through everything up to target. Items after liveFrom count as
  // happening now in real time (realNow, from performance.now()), for the
  // animations; the rest is the past being replayed.
  advanceTo(target: number, realNow = -Infinity, liveFrom = target - 2000) {
    for (;;) {
      while (this.nextDayToLoad <= target) this.loadDay(this.nextDayToLoad);
      const next = this.queue.peek();
      if (!next || next.at > target) break;
      this.queue.pop();
      this.now = Math.max(this.now, next.at);
      this.realNow = next.at > liveFrom ? realNow : -Infinity;
      next.run();
      this.recordHistory();
    }
    this.now = Math.max(this.now, target);
    this.realNow = realNow;
    this.recordHistory();
  }

  // when the next planned thing happens (DHT readings don't count)
  nextEventAt(after: number): number | undefined {
    for (const dayStart of [startOfDay(after), planDay(startOfDay(after)).end]) {
      const event = planDay(dayStart).events.find(
        (item) => item.at > after && item.action.type !== 'dht',
      );
      if (event) return event.at;
    }
    return undefined;
  }

  private loadDay(dayStart: number) {
    const plan = planDay(dayStart);
    this.queue.push(plan.start, () => {
      this.pointsToday = 0;
      // the history and log only keep about a day and a half
      const keepFrom = plan.start - 12 * 3600 * 1000;
      while (this.history.length > 1 && this.history[1].at < keepFrom) this.history.shift();
    });
    for (const event of plan.events) this.queue.push(event.at, () => this.apply(event));
    this.nextDayToLoad = plan.end;
  }

  // something the visitor does; times are relative to now
  perform(events: PlannedEvent[]) {
    for (const event of events)
      this.queue.push(Math.max(event.at, this.now), () => this.apply(event));
    this.advanceTo(this.now, this.realNow);
  }

  // the dashboard's alarm form: answers like the Flask route
  deactivateFromDashboard(pin: string): boolean {
    let ok = false;
    this.queue.push(this.now, () => {
      ok = this.webRequest({ path: '/api/alarm/deactivate', pin });
    });
    this.advanceTo(this.now, this.realNow);
    return ok;
  }

  get security(): Security {
    if (this.alarmActive) return 'alarm';
    if (this.securityArmed) return 'armed';
    if (this.armingUntil > this.now) return 'arming';
    return 'disarmed';
  }

  // how recently a device reported, in real milliseconds (Infinity if not
  // during this visit)
  sinceSeen(device: DeviceId, realNow: number): number {
    const seen = this.lastSeen.get(device);
    return seen ? realNow - seen.real : Infinity;
  }

  private schedule(delay: number, run: () => void): Timer {
    const timer: Timer = { cancelled: false };
    this.queue.push(this.now + delay, () => {
      if (!timer.cancelled) run();
    });
    return timer;
  }

  private recordHistory() {
    const last = this.history[this.history.length - 1];
    const security = this.security;
    if (last && last.people === this.peopleCount && last.security === security) return;
    if (last && last.at === this.now) this.history.pop();
    this.history.push({ at: this.now, people: this.peopleCount, security });
  }

  private addLog(kind: LogKind, source: LogEntry['source'], text: string, topic?: string) {
    this.log.push({ id: this.nextLogId++, at: this.now, kind, source, topic, text });
    if (this.log.length > LOG_SIZE) this.log.shift();
  }

  private serverSays(text: string) {
    this.addLog('server', 'server', text);
  }

  // --- the devices publishing ---

  private apply(event: PlannedEvent) {
    if (event.story) this.addLog('story', 'story', event.story);
    this.applyAction(event.action);
  }

  private applyAction(action: PlannedAction) {
    if (action.type === 'dht') {
      const { temperature, humidity } = readClimate(action.device, this.now);
      this.publish(action.device, 'Humidity', humidity);
      this.publish(action.device, 'Temperature', temperature);
    } else if (action.type === 'reading') {
      this.publish(action.device, action.measurement, action.value);
    } else {
      this.webRequest(action.request);
    }
  }

  // a sensor's MQTT message, received by the server (on_message)
  private publish(device: DeviceId, measurement: string, value: number | string) {
    const info = DEVICES[device];
    this.lastSeen.set(device, { at: this.now, real: this.realNow, value });
    if (device === 'DS1' || device === 'DS2') this.doors[device] = value ? 1 : 0;

    this.addLog('sensor', info.pi, json({ measurement, value, name: info.name }), info.topic);
    this.pointsToday++; // save_to_db
    this.processLogic(info.topic, measurement, value, info.name);
  }

  // the server publishing a command, and the Pi carrying it out
  private command(
    device: 'DL' | 'DB' | 'BRGB' | '4SD',
    payload: Record<string, string>,
    quiet = false,
  ) {
    const info = DEVICES[device];
    if (!quiet) this.addLog('command', 'server', json(payload), info.topic);
    const command = payload.command;

    const report = (measurement: string, value: number | string) => {
      this.addLog(
        'actuator',
        info.pi,
        json({ measurement, value, name: info.name }),
        `Actuators/${device}`,
      );
      this.pointsToday++;
    };

    if (device === 'DL') {
      this.doorLight = command === 'on';
      report('Light_Status', this.doorLight ? 1 : 0);
    } else if (device === 'DB') {
      this.buzzer = command === 'on';
      report('Buzzer_Status', this.buzzer ? 1 : 0);
    } else if (device === 'BRGB') {
      this.rgb = command;
      report('RGB_Color', command);
    }
    this.lastSeen.set(device, { at: this.now, real: this.realNow, value: command });
  }

  // --- the alarm ---

  private triggerAlarm(reason: string) {
    if (this.alarmActive) return;
    this.alarmActive = true;
    this.alarmReason = reason;
    this.serverSays(`ALARM: ${reason}`);
    this.command('DB', { command: 'on' });
    this.pointsToday++; // Alarm_State
  }

  private deactivateAlarm() {
    if (!this.alarmActive) return;
    this.alarmActive = false;
    this.serverSays('Alarm off');
    this.command('DB', { command: 'off' });
    this.pointsToday++;
  }

  private cancelIntrusion() {
    if (this.intrusionTimer) {
      this.intrusionTimer.cancelled = true;
      this.intrusionTimer = null;
      this.intrusionUntil = -Infinity;
      this.serverSays('Intruder countdown cancelled');
    }
  }

  // --- the keypad (handle_dms_input) ---

  private handleDmsInput(key: string) {
    this.pinBuffer += key;

    // typed too slowly (5 s): what was typed so far is forgotten
    if (this.pinClearTimer) this.pinClearTimer.cancelled = true;
    this.pinClearTimer = this.schedule(5000, () => {
      this.pinBuffer = '';
    });

    if (this.pinBuffer.length < 4) return;
    const entered = this.pinBuffer;
    this.pinBuffer = '';

    if (entered !== SECRET_PIN) {
      this.serverSays(`Wrong PIN: ${'•'.repeat(entered.length)}`);
      return;
    }
    this.serverSays('Correct PIN');
    this.cancelIntrusion();

    if (this.alarmActive) {
      this.deactivateAlarm();
      this.securityArmed = false;
      this.serverSays('Security disarmed');
    } else if (this.securityArmed) {
      this.securityArmed = false;
      this.serverSays('Security disarmed');
    } else {
      // armed after 10 s, time to leave the house
      this.serverSays('Arming in 10 seconds: leave the house');
      this.armingUntil = this.now + 10000;
      this.schedule(10000, () => {
        this.securityArmed = true;
        this.serverSays('Security ARMED');
      });
    }
  }

  // --- the door light (turn_on_dl_for_10s) ---

  private turnOnDoorLightFor10s() {
    if (this.dlTimer) {
      this.dlTimer.cancelled = true;
    } else {
      this.command('DL', { command: 'on' });
    }
    this.dlTimer = this.schedule(10000, () => {
      this.command('DL', { command: 'off' });
      this.dlTimer = null;
    });
  }

  // --- the kitchen timer (run_stopwatch_tick) ---

  private stopwatchTick() {
    if (!this.stopwatchRunning || this.stopwatchTime <= 0) return;
    this.stopwatchTime -= 1;
    const minutes = String(Math.floor(this.stopwatchTime / 60)).padStart(2, '0');
    const seconds = String(this.stopwatchTime % 60).padStart(2, '0');
    // every second; left out of the log, which it would fill
    this.command('4SD', { command: 'show', text: `${minutes}:${seconds}` }, true);

    if (this.stopwatchTime === 0) {
      this.stopwatchRunning = false;
      this.stopwatchBlinking = true;
      this.serverSays('Kitchen timer is up');
      this.command('4SD', { command: 'blink' });
    } else {
      this.schedule(1000, () => this.stopwatchTick());
    }
  }

  private startStopwatch() {
    if (!this.stopwatchRunning) {
      this.stopwatchRunning = true;
      this.stopwatchTick();
    }
  }

  // --- process_logic ---

  private processLogic(topic: string, measurement: string, value: number | string, name: string) {
    const now = this.now;

    // the two doors: a person at the distance sensor outside and motion
    // inside, within 5 s of each other; the order tells in from out
    for (const door of [1, 2] as const) {
      if (
        topic === `Sensors/DUS${door}` &&
        measurement === 'Distance' &&
        Number(value) < DISTANCE_THRESHOLD
      ) {
        this.lastDus[door] = now;
        if (now - this.lastDpir[door] < TIME_WINDOW && now - this.cooldowns[door] > TIME_WINDOW) {
          this.peopleCount = Math.max(0, this.peopleCount - 1);
          this.cooldowns[door] = now;
          this.serverSays(`Someone LEFT through door ${door}: ${this.peopleCount} at home`);
        }
      }
      if (topic === `Sensors/DPIR${door}` && measurement === 'Motion' && value === 1) {
        this.lastDpir[door] = now;
        if (door === 1) this.turnOnDoorLightFor10s();
        if (now - this.lastDus[door] < TIME_WINDOW && now - this.cooldowns[door] > TIME_WINDOW) {
          this.peopleCount += 1;
          this.cooldowns[door] = now;
          this.serverSays(`Someone CAME IN through door ${door}: ${this.peopleCount} at home`);
        }
      }
    }

    if (topic === 'Sensors/DMS' && measurement === 'Key_Pressed') {
      this.handleDmsInput(String(value));
    }

    // a door left open for more than 5 s; opened while armed, 10 s for the PIN
    if (measurement === 'Door_Status') {
      const door = topic.split('/').pop() as DoorSensor;
      if (value === 1) {
        if (!this.doorOpenTimers.has(door)) {
          this.doorOpenTimers.set(
            door,
            this.schedule(5000, () =>
              this.triggerAlarm(`${door} was left open for more than 5 seconds`),
            ),
          );
          if (this.securityArmed && !this.alarmActive) {
            this.serverSays(`Entry on ${door} while armed: 10 seconds to enter the PIN`);
            if (this.intrusionTimer) this.intrusionTimer.cancelled = true;
            this.intrusionUntil = now + 10000;
            this.intrusionTimer = this.schedule(10000, () => {
              this.intrusionTimer = null;
              this.intrusionUntil = -Infinity;
              this.triggerAlarm(`Entry on ${door} without the PIN`);
            });
          }
        }
      } else {
        const timer = this.doorOpenTimers.get(door);
        if (timer) {
          timer.cancelled = true;
          this.doorOpenTimers.delete(door);
        }
        // only the alarm this door caused goes off with it (while armed, only
        // the PIN turns the alarm off)
        if (
          this.alarmActive &&
          !this.securityArmed &&
          this.alarmReason.startsWith(`${door} was left open`)
        ) {
          this.deactivateAlarm();
        }
      }
    }

    // motion in an empty house
    if (
      ['Sensors/DPIR1', 'Sensors/DPIR2', 'Sensors/DPIR3'].includes(topic) &&
      measurement === 'Motion' &&
      value === 1
    ) {
      if (this.peopleCount === 0) {
        this.triggerAlarm(`Motion on ${topic.split('/').pop()} while nobody is home`);
      }
    }

    // the family icon on the wall
    if (topic === 'Sensors/Gyro') {
      try {
        const axes = JSON.parse(String(value)) as number[];
        if (
          measurement === 'Acceleration' &&
          (Math.abs(axes[0]) > 0.85 || Math.abs(axes[1]) > 0.85)
        ) {
          this.triggerAlarm('The family icon was moved');
        } else if (
          measurement === 'Rotation' &&
          (Math.abs(axes[0]) > 35 || Math.abs(axes[1]) > 35)
        ) {
          this.triggerAlarm('The family icon is tilting');
        }
      } catch {
        // a malformed reading is ignored, as in server.py
      }
    }

    // the latest readings, which the LCD shows in turn
    if (measurement === 'Temperature' || measurement === 'Humidity') {
      const reading = this.dhtReadings.get(name) ?? { temp: 0, hum: 0 };
      if (measurement === 'Temperature') reading.temp = Number(value);
      else reading.hum = Number(value);
      this.dhtReadings.set(name, reading);
    }

    // the kitchen button: stops the blinking, or adds N seconds
    if (topic === 'Sensors/BTN' && measurement === 'Button_Pressed' && value === 1) {
      if (this.stopwatchBlinking) {
        this.stopwatchBlinking = false;
        this.stopwatchTime = 0;
        this.command('4SD', { command: 'clear' });
      } else {
        this.stopwatchTime += this.btnAddSeconds;
        this.serverSays(`Kitchen timer +${this.btnAddSeconds} s`);
        this.startStopwatch();
      }
    }

    // the remote's buttons pick the bedroom light's color
    if (topic === 'Sensors/IR' && measurement === 'IR_Remote') {
      const color = IR_COLORS[String(value)];
      if (color) this.command('BRGB', { command: color });
    }
  }

  // --- the Flask routes the dashboard calls ---

  private webRequest(request: WebRequest): boolean {
    const shown =
      request.path === '/api/alarm/deactivate'
        ? { pin: '•'.repeat(request.pin.length) }
        : { ...request, path: undefined };
    this.addLog('web', 'web', json(shown), `POST ${request.path}`);

    if (request.path === '/api/rgb') {
      this.command('BRGB', { command: request.color });
      return true;
    }
    if (request.path === '/api/stopwatch') {
      if (request.action === 'set_time') {
        this.stopwatchTime = request.time;
        this.stopwatchBlinking = false;
        if (request.time > 0) this.startStopwatch();
      } else {
        this.btnAddSeconds = request.n;
      }
      return true;
    }
    // /api/alarm/deactivate
    if (request.pin !== SECRET_PIN) {
      this.serverSays('Dashboard: wrong PIN (403)');
      return false;
    }
    this.deactivateAlarm();
    this.securityArmed = false;
    this.cancelIntrusion();
    this.serverSays('Dashboard: alarm and security deactivated');
    return true;
  }

  // --- for the UI ---

  // the LCD shows each room in turn, 5 s each (the server's rotation loop)
  lcdText(): [string, string] {
    const names = [...this.dhtReadings.keys()];
    if (names.length === 0) return ['', ''];
    const name = names[Math.floor(this.now / 5000) % names.length];
    const reading = this.dhtReadings.get(name)!;
    return [name.slice(0, 16), `T:${reading.temp.toFixed(1)}C H:${reading.hum.toFixed(1)}%`];
  }

  distance(door: 1 | 2): number {
    const seen = this.lastSeen.get(door === 1 ? 'DUS1' : 'DUS2');
    if (seen && this.now - seen.at < 3000) return Number(seen.value);
    return idleDistance(door, this.now);
  }

  climate(device: DhtId) {
    return readClimate(device, this.now);
  }
}
