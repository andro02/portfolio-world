import { useEffect } from 'react';
import { Terminal } from '../../ui/terminal/Terminal';
import { loadEngine } from './engine/engine';
import type { MemoryFileSystem } from './engine/memoryFs';

const WASM_URL = `${import.meta.env.BASE_URL}projects/kv-storage-engine/kv.wasm`;

const WELCOME = [
  'NoSQL key-value storage engine (LSM-tree), written in Go.',
  'This is the real engine, compiled to WebAssembly and running in your browser.',
  '',
  'Try: PUT name andrija, GET name, then a few more PUTs and "ls"',
  'to watch WAL segments and SSTables appear. Type "help" for all commands.',
];

// commands handled here, on top of the ones the engine provides
const EXTRA_HELP = `
Terminal commands:
  ls                         list engine files (WAL segments, SSTables)
  clear                      clear the screen`;

async function handleCommand(input: string): Promise<string> {
  const engine = await loadEngine(WASM_URL);
  const command = input.trim().toLowerCase();

  if (command === 'ls') return listFiles(engine.fs).join('\n');

  const output = await engine.execute(input);
  return command === 'help' ? output + EXTRA_HELP : output;
}

// lists the engine's in-memory file system as an indented tree
function listFiles(fs: MemoryFileSystem, path = '/', indent = ''): string[] {
  return fs
    .list(path)
    .flatMap(([name, size]) =>
      size === null
        ? [`${indent}${name}/`, ...listFiles(fs, `${path}${name}/`, indent + '  ')]
        : [`${indent}${name.padEnd(32 - indent.length)}${size} B`],
    );
}

// default export so the registry can lazy-load this file
export default function KvShowcase() {
  // start downloading the engine as soon as the panel opens
  useEffect(() => {
    void loadEngine(WASM_URL);
  }, []);

  return <Terminal onCommand={handleCommand} welcome={WELCOME} />;
}
