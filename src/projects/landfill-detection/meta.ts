import type { ProjectMeta } from '../types';

export const landfillDetection: ProjectMeta = {
  slug: 'landfill-detection',
  title: 'AI-Powered Landfill Detection',
  year: 2026,
  kind: 'ml',
  summary:
    'Detects illegal landfills in satellite imagery using YOLO11m and SAM, then assesses ecological risk and remediation readiness with a Drools knowledge system (forward/backward chaining, real-time CEP).',
  tech: ['Python', 'PyTorch', 'YOLO11', 'SAM', 'Drools', 'Java'],
  links: { github: 'https://github.com/andro02/illegal-landfill-risk-system' },
  position: [0, 0, -18],
};
