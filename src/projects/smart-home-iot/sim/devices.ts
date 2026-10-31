// The devices of the project, as in its settings.json: what each one is,
// which Raspberry Pi drives it and which room it is in.

export type PiId = 'PI1' | 'PI2' | 'PI3';

export type DeviceId =
  | 'DS1'
  | 'DL'
  | 'DMS'
  | 'DB'
  | 'DPIR1'
  | 'DUS1'
  | 'WEBC'
  | 'DS2'
  | 'DUS2'
  | 'DPIR2'
  | '4SD'
  | 'BTN'
  | 'DHT3'
  | 'GSG'
  | 'DHT1'
  | 'DHT2'
  | 'IR'
  | 'BRGB'
  | 'LCD'
  | 'DPIR3';

export type RoomId = 'entrance' | 'kitchen' | 'living' | 'bedroom' | 'master';

export interface Device {
  id: DeviceId;
  name: string; // as in settings.json, so it matches the MQTT messages
  pi: PiId;
  room: RoomId;
  kind: 'sensor' | 'actuator';
  // MQTT topic the device publishes to (sensors) or listens on (actuators)
  topic: string;
  description: string;
}

export const DEVICES: Record<DeviceId, Device> = {
  DS1: {
    id: 'DS1',
    name: 'Door Sensor 1',
    pi: 'PI1',
    room: 'entrance',
    kind: 'sensor',
    topic: 'Sensors/DS1',
    description: 'Magnetic contact on the front door: 1 when open, 0 when closed.',
  },
  DL: {
    id: 'DL',
    name: 'Door Light',
    pi: 'PI1',
    room: 'entrance',
    kind: 'actuator',
    topic: 'Commands/PI1/DL',
    description: 'Light over the front door, switched on for 10 s by motion in the hall.',
  },
  DMS: {
    id: 'DMS',
    name: 'Door Membrane Switch',
    pi: 'PI1',
    room: 'entrance',
    kind: 'sensor',
    topic: 'Sensors/DMS',
    description: 'Keypad by the front door. The PIN (1111) arms and disarms the alarm.',
  },
  DB: {
    id: 'DB',
    name: 'Door Buzzer',
    pi: 'PI1',
    room: 'entrance',
    kind: 'actuator',
    topic: 'Commands/PI1/DB',
    description: 'The alarm siren: sounds while the alarm is on.',
  },
  DPIR1: {
    id: 'DPIR1',
    name: 'Door Motion Sensor 1',
    pi: 'PI1',
    room: 'entrance',
    kind: 'sensor',
    topic: 'Sensors/DPIR1',
    description: 'Motion sensor inside the front door.',
  },
  DUS1: {
    id: 'DUS1',
    name: 'Door Ultrasonic Sensor 1',
    pi: 'PI1',
    room: 'entrance',
    kind: 'sensor',
    topic: 'Sensors/DUS1',
    description:
      'Measures the distance to whoever stands outside the front door. Together with the motion sensor it tells entering from leaving.',
  },
  WEBC: {
    id: 'WEBC',
    name: 'Door Web Camera',
    pi: 'PI1',
    room: 'entrance',
    kind: 'sensor',
    topic: 'stream (HTTP)',
    description: 'Camera at the front door, streamed to the dashboard over HTTP.',
  },
  DS2: {
    id: 'DS2',
    name: 'Door Sensor 2',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/DS2',
    description: 'Magnetic contact on the back door: 1 when open, 0 when closed.',
  },
  DUS2: {
    id: 'DUS2',
    name: 'Door Ultrasonic Sensor 2',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/DUS2',
    description: 'Distance sensor outside the back door.',
  },
  DPIR2: {
    id: 'DPIR2',
    name: 'Door Motion Sensor 2',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/DPIR2',
    description: 'Motion sensor inside the back door.',
  },
  '4SD': {
    id: '4SD',
    name: 'Kitchen Timer',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'actuator',
    topic: 'Commands/PI2/4SD',
    description:
      'Four-digit display: the kitchen timer counting down, blinking when it runs out, the time otherwise.',
  },
  BTN: {
    id: 'BTN',
    name: 'Kitchen Button',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/BTN',
    description: 'Adds N seconds to the kitchen timer, or stops it blinking.',
  },
  DHT3: {
    id: 'DHT3',
    name: 'Kitchen DHT',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/DHT',
    description: 'Temperature and humidity in the kitchen.',
  },
  GSG: {
    id: 'GSG',
    name: 'Gyroscope',
    pi: 'PI2',
    room: 'kitchen',
    kind: 'sensor',
    topic: 'Sensors/Gyro',
    description:
      'Accelerometer and gyroscope on the family icon on the wall: moving or tilting it sets off the alarm.',
  },
  DHT1: {
    id: 'DHT1',
    name: 'Bedroom DHT',
    pi: 'PI3',
    room: 'bedroom',
    kind: 'sensor',
    topic: 'Sensors/DHT',
    description: 'Temperature and humidity in the bedroom.',
  },
  DHT2: {
    id: 'DHT2',
    name: 'Master Bedroom DHT',
    pi: 'PI3',
    room: 'master',
    kind: 'sensor',
    topic: 'Sensors/DHT',
    description: 'Temperature and humidity in the master bedroom.',
  },
  IR: {
    id: 'IR',
    name: 'Bedroom Infrared',
    pi: 'PI3',
    room: 'bedroom',
    kind: 'sensor',
    topic: 'Sensors/IR',
    description: 'Receiver for the remote control: buttons 1-7 pick a light color, 0 turns it off.',
  },
  BRGB: {
    id: 'BRGB',
    name: 'Bedroom RGB',
    pi: 'PI3',
    room: 'bedroom',
    kind: 'actuator',
    topic: 'Commands/PI3/BRGB',
    description: 'RGB light in the bedroom.',
  },
  LCD: {
    id: 'LCD',
    name: 'LR Display',
    pi: 'PI3',
    room: 'living',
    kind: 'actuator',
    topic: 'Commands/PI3/LCD',
    description: 'LCD in the living room, showing each room’s temperature and humidity in turn.',
  },
  DPIR3: {
    id: 'DPIR3',
    name: 'LR Motion Sensor',
    pi: 'PI3',
    room: 'living',
    kind: 'sensor',
    topic: 'Sensors/DPIR3',
    description: 'Motion sensor in the living room.',
  },
};

export const DHT_SENSORS = ['DHT1', 'DHT2', 'DHT3'] as const;
export type DhtId = (typeof DHT_SENSORS)[number];

export const PI_LABELS: Record<PiId, string> = {
  PI1: 'Pi 1 · front door',
  PI2: 'Pi 2 · kitchen',
  PI3: 'Pi 3 · rooms',
};

// what the remote's buttons do (color_map in server.py)
export const IR_COLORS: Record<string, string> = {
  '1': 'red',
  '2': 'green',
  '3': 'blue',
  '4': 'yellow',
  '5': 'purple',
  '6': 'light_blue',
  '7': 'white',
  '0': 'off',
};

export const RGB_CSS: Record<string, string> = {
  red: '#ff4d4d',
  green: '#4dd97a',
  blue: '#4d8dff',
  yellow: '#ffd84d',
  purple: '#b26bff',
  light_blue: '#6fd6ff',
  white: '#fff8e8',
};
