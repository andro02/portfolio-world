import type { ProjectMeta } from '../types';

// the whole system (map, Drools risk assessment, live notifications) running
// on a small server; shown inside the panel and linked for a new tab
export const LANDFILL_DEMO_URL = 'https://158-180-234-106.sslip.io';

export const landfillDetection: ProjectMeta = {
  slug: 'landfill-detection',
  title: 'AI-Powered Landfill Detection',
  shortTitle: 'Landfill Detection',
  year: 2026,
  kind: 'ml',
  summary:
    'Detects illegal landfills in satellite imagery using YOLO11m and SAM, then assesses ecological risk and remediation readiness with a Drools knowledge system (forward/backward chaining, real-time CEP).',
  tech: ['Python', 'PyTorch', 'YOLO11', 'SAM', 'Drools', 'Java', 'Spring Boot', 'PostGIS', 'React'],
  links: {
    github: 'https://github.com/andro02/illegal-landfill-risk-system',
    demo: LANDFILL_DEMO_URL,
  },
  position: [0, 0, -18],
  accent: '#3e9b5b',
  icon: 'factory',
  theme: 'detection',
  highlights: [
    'YOLO11m detects landfills in orthophoto imagery, SAM estimates their area',
    'Waste volume, mass and methane emissions estimated with the IPCC methodology',
    'Drools rules rate the risk from nearby rivers, settlements, schools and roads',
    'Backward chaining checks remediation prerequisites, CEP spots new landfill patterns live',
  ],
};
