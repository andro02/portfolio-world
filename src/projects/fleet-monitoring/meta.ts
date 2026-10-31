import type { ProjectMeta } from '../types';

// the whole system (backend, simulator, RabbitMQ, InfluxDB, PostgreSQL with
// the load-test data) running on a small server
export const FLEET_DEMO_URL = 'https://89-168-28-126.sslip.io';

export const fleetMonitoring: ProjectMeta = {
  slug: 'fleet-monitoring',
  title: 'Factory & Fleet Monitoring',
  shortTitle: 'Fleet Monitoring',
  year: 2026,
  kind: 'web',
  summary:
    'Full-stack platform for managing factories, warehouses and vehicle fleets, with real-time sensor telemetry ingested through RabbitMQ and stored as time series in InfluxDB.',
  tech: ['Spring Boot', 'Angular', 'RabbitMQ', 'InfluxDB', 'PostgreSQL', 'Redis', 'Docker'],
  links: {
    github: 'https://github.com/andro02/smart-company-platform',
    demo: FLEET_DEMO_URL,
  },
  position: [17.1, 0, -5.6],
  accent: '#e07b39',
  theme: 'route',
  highlights: [
    'Management of factories, warehouses and vehicle fleets',
    'Real-time sensor telemetry ingested through RabbitMQ',
    'Time series in InfluxDB, business data in PostgreSQL',
    'Spring Boot backend with an Angular frontend',
    'Runs on the load-test data: 3 million users, 2 million companies, 29 million production records',
  ],
  demoAccounts: [
    { role: 'Admin', username: 'demo-admin', password: 'demo1234' },
    { role: 'Manager', username: 'demo-manager', password: 'demo1234' },
    { role: 'Customer', username: 'demo-customer', password: 'demo1234' },
  ],
};
