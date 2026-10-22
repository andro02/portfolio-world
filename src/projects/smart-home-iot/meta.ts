import type { ProjectMeta } from '../types';

export const smartHomeIot: ProjectMeta = {
  slug: 'smart-home-iot',
  title: 'Smart Home IoT System',
  year: 2025,
  kind: 'iot',
  summary:
    'Distributed smart home system on Raspberry Pi: independent sensor and actuator nodes communicate over MQTT, a Flask server runs automation and alarm logic as a state machine, monitored through InfluxDB, Grafana and a live dashboard.',
  tech: ['Python', 'Raspberry Pi', 'MQTT', 'Flask', 'InfluxDB', 'Grafana'],
  links: { github: 'https://github.com/andro02/smart-home-iot-system' },
  position: [10.6, 0, 14.6],
};
