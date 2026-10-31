import type { DhtId } from './devices';
import { hashString, smoothNoise } from './random';
import { planDay } from './schedule';
import { DAY, HOUR, MINUTE, hourOfDay, startOfDay, yearFraction } from './time';

// Temperature and humidity in each room at any moment, worked out from the
// time itself: the season, the time of day, a slow random drift, and what
// happens in the room (cooking warms the kitchen, a shower humidifies the
// master bedroom). Any moment can be asked, past or present, which is how the
// charts get the last 24 hours without anything being stored.

interface RoomClimate {
  temperature: number; // °C, yearly average
  humidity: number; // %
}

const CLIMATE: Record<DhtId, RoomClimate> = {
  DHT1: { temperature: 21.2, humidity: 46 }, // bedroom
  DHT2: { temperature: 20.4, humidity: 48 }, // master bedroom
  DHT3: { temperature: 22.0, humidity: 50 }, // kitchen
};

const SEEDS: Record<DhtId, number> = {
  DHT1: hashString('DHT1'),
  DHT2: hashString('DHT2'),
  DHT3: hashString('DHT3'),
};

// how much a room activity (see schedule.ts) counts at this moment: rises
// over its first minutes and fades out slowly after it
function activityEffect(device: DhtId, ms: number): { heat: number; humidity: number } {
  let heat = 0;
  let humidity = 0;
  // an activity can reach past midnight, so yesterday's plan counts too
  for (const dayStart of new Set([startOfDay(ms), startOfDay(ms - DAY / 2)])) {
    for (const activity of planDay(dayStart).activities) {
      if (activity.device !== device || ms < activity.from) continue;
      const rise = Math.min(1, (ms - activity.from) / (10 * MINUTE));
      const fade = ms <= activity.to ? 1 : Math.exp(-(ms - activity.to) / (25 * MINUTE));
      const weight = rise * fade;
      if (weight < 0.01) continue;
      heat = Math.max(heat, activity.heat * weight);
      humidity = Math.max(humidity, activity.humidity * weight);
    }
  }
  return { heat, humidity };
}

export interface ClimateReading {
  temperature: number;
  humidity: number;
}

export function readClimate(device: DhtId, ms: number): ClimateReading {
  const climate = CLIMATE[device];
  const seed = SEEDS[device];
  // a little cooler in winter (the heating keeps it close), warmer in summer
  const season = -Math.cos(2 * Math.PI * (yearFraction(ms) - 0.04)) * 2.2;
  // the warmest in the late afternoon, the coolest before dawn
  const daily = Math.sin((2 * Math.PI * (hourOfDay(ms) - 10)) / 24) * 0.9;
  const drift =
    smoothNoise(seed, ms / (90 * MINUTE)) * 0.5 + smoothNoise(seed ^ 1, ms / (6 * HOUR)) * 0.6;
  const activity = activityEffect(device, ms);

  const temperature = climate.temperature + season + daily + drift + activity.heat;
  const humidity =
    climate.humidity -
    daily * 3 +
    season * 1.5 +
    smoothNoise(seed ^ 2, ms / (80 * MINUTE)) * 3 +
    activity.humidity;

  return {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(Math.min(95, Math.max(20, humidity)) * 10) / 10,
  };
}

// what a distance sensor outside a door measures while nobody is there
export function idleDistance(door: 1 | 2, ms: number): number {
  const base = door === 1 ? 148 : 172;
  return Math.round((base + smoothNoise(door * 7919, ms / 4000) * 3) * 10) / 10;
}
