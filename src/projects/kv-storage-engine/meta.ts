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
  accent: '#1a9c8f',
  theme: 'terminal',
  highlights: [
    'Write-ahead log, memtable (B-tree or skip list) and flushes to SSTables',
    'SSTable index, summary and Bloom filter files, checked with a Merkle tree',
    'LRU cache, token bucket rate limiting, Count-Min Sketch and HyperLogLog',
    'Runs right here: compiled to WebAssembly with an in-memory file system',
  ],
};
