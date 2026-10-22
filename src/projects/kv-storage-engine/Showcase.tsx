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
  ls [directory]             list engine files (WAL segments, SSTables)
  clear                      clear the screen`;

async function handleCommand(input: string): Promise<string> {
  const engine = await loadEngine(WASM_URL);
  const [command, ...args] = input.trim().split(/\s+/);
  const name = command.toLowerCase();

  if (name === 'ls') return listCommand(engine.fs, args[0]);

  const output = await engine.execute(input);
  return name === 'help' ? output + EXTRA_HELP : output;
}

// handles "ls", "ls logs", "ls /sstable/" etc.
function listCommand(fs: MemoryFileSystem, directory = ''): string {
  const name = directory.replace(/^\/+|\/+$/g, ''); // trim leading and trailing slashes
  const path = name ? `/${name}/` : '/';

  try {
    const lines = listFiles(fs, path);
    return lines.length > 0 ? lines.join('\n') : '(empty)';
  } catch {
    return `ls: ${directory}: no such directory`;
  }
}

// lists the engine's in-memory file system as an indented tree
function listFiles(fs: MemoryFileSystem, path: string, indent = ''): string[] {
  return fs.list(path).flatMap(([name, size]) => {
    if (size !== null) return [`${indent}${name.padEnd(32 - indent.length)}${size} B`];

    const children = listFiles(fs, `${path}${name}/`, indent + '  ');
    return [`${indent}${name}/`, ...(children.length > 0 ? children : [`${indent}  (empty)`])];
  });
}

// default export so the registry can lazy-load this file
export default function KvShowcase() {
  // start downloading the engine as soon as the panel opens
  useEffect(() => {
    void loadEngine(WASM_URL);
  }, []);

  return <Terminal onCommand={handleCommand} welcome={WELCOME} />;
}
