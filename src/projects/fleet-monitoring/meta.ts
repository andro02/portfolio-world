import type { ProjectMeta } from '../types';

export const fleetMonitoring: ProjectMeta = {
  slug: 'fleet-monitoring',
  title: 'Factory & Fleet Monitoring',
  shortTitle: 'Fleet Monitoring',
  year: 2026,
  kind: 'web',
  summary:
    'Full-stack platform for managing factories, warehouses and vehicle fleets, with real-time sensor telemetry ingested through RabbitMQ and stored as time series in InfluxDB.',
  tech: ['Spring Boot', 'Angular', 'RabbitMQ', 'InfluxDB', 'PostgreSQL'],
  links: { github: 'https://github.com/andro02/smart-company-platform' },
  position: [17.1, 0, -5.6],
  accent: '#e07b39',
  theme: 'route',
  highlights: [
    'Management of factories, warehouses and vehicle fleets',
    'Real-time sensor telemetry ingested through RabbitMQ',
    'Time series in InfluxDB, business data in PostgreSQL',
    'Spring Boot backend with an Angular frontend',
  ],
};
