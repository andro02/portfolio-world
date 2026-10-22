import type { ProjectMeta } from '../types';

export const kvStorageEngine: ProjectMeta = {
  slug: 'kv-storage-engine',
  title: 'NoSQL Key-Value Engine',
  year: 2023,
  kind: 'console',
  summary:
    'LSM-tree key-value storage engine written from scratch in Go, with a write-ahead log, memtable, SSTable compaction, Bloom filters and probabilistic structures (Count-Min Sketch, HyperLogLog).',
  tech: ['Go', 'LSM-tree', 'WAL', 'Bloom filter', 'HyperLogLog'],
  links: { github: 'https://github.com/andro02/nosql-storage-engine' },
  position: [-17.1, 0, -5.6],
};
