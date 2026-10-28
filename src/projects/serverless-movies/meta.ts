import type { ProjectMeta } from '../types';

export const serverlessMovies: ProjectMeta = {
  slug: 'serverless-movies',
  title: 'Serverless Movie Platform',
  year: 2024,
  kind: 'backend',
  summary:
    'Serverless movie catalog on AWS built with Lambda, API Gateway, DynamoDB and S3, with two Cognito user pools for role-based admin and client access.',
  tech: ['AWS Lambda', 'API Gateway', 'DynamoDB', 'S3', 'Cognito'],
  links: { github: 'https://github.com/andro02/serverless-movie-platform' },
  position: [-10.6, 0, 14.6],
  accent: '#8a5cd0',
  theme: 'cloud',
  highlights: [
    'Movie catalog API on AWS Lambda behind API Gateway',
    'Metadata in DynamoDB, video files in S3',
    'Two Cognito user pools for admin and client roles',
  ],
};
