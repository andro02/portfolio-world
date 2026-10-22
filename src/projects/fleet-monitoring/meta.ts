import type { ProjectMeta } from '../types';

export const fleetMonitoring: ProjectMeta = {
  slug: 'fleet-monitoring',
  title: 'Factory & Fleet Monitoring',
  year: 2026,
  kind: 'web',
  summary:
    'Full-stack platform for managing factories, warehouses and vehicle fleets, with real-time sensor telemetry ingested through RabbitMQ and stored as time series in InfluxDB.',
  tech: ['Spring Boot', 'Angular', 'RabbitMQ', 'InfluxDB', 'PostgreSQL'],
  links: { github: 'https://github.com/andro02/smart-company-platform' },
  position: [17.1, 0, -5.6],
};
