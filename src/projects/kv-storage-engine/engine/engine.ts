import './wasm_exec.js'; // defines the global `Go` class that runs Go WebAssembly
import { MemoryFileSystem } from './memoryFs';

declare global {
  // provided by wasm_exec.js
  class Go {
    importObject: WebAssembly.Imports;
    run(instance: WebAssembly.Instance): Promise<void>;
  }

  // registered by the Go program (see cmd/wasm/main.go in the engine repository)
  var kvExecute: ((input: string) => Promise<void>) | undefined;
  var kvOnReady: (() => void) | undefined;
}

// engine settings tuned for the demo: small memtable and WAL segments so that
// flushes to SSTables and WAL files happen after just a few commands
const CONFIG = `cacheSize=15
memtableThreshold=120
memtableStructure=0
memtableSingleFile=0
requestPermin=10
sstableMultipleFiles=1
sstableSegmentSize=5
walDataSize=3
walFileSize=5
walLowWaterMark=3
bfExpectedElements=1000
bfFalsePositiveRate=1
bTreeLimit=5
skipListSize=5
tokenBucketMaxTokens=50
tokenBucketRefill=5
`;

export interface KvEngine {
  execute(input: string): Promise<string>;
  fs: MemoryFileSystem;
}

let enginePromise: Promise<KvEngine> | null = null;

// starts the engine once per page load; later calls reuse the same instance
export function loadEngine(wasmUrl: string): Promise<KvEngine> {
  enginePromise ??= startEngine(wasmUrl);
  return enginePromise;
}

async function startEngine(wasmUrl: string): Promise<KvEngine> {
  const fs = new MemoryFileSystem();
  fs.writeFile('/config.txt', CONFIG);
  fs.writeFile('/cms.bin', '');
  fs.writeFile('/hll.bin', '');
  fs.mkdirSync('/logs');
  fs.mkdirSync('/sstable');

  // Go's runtime performs file operations through a global Node-style `fs` object
  (globalThis as unknown as { fs: MemoryFileSystem }).fs = fs;

  const go = new Go();
  const response = await fetch(wasmUrl);
  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject);

  const ready = new Promise<void>((resolve) => {
    globalThis.kvOnReady = resolve;
  });
  void go.run(instance); // only settles if the Go program exits
  await ready;

  let output = '';
  fs.onOutput = (text) => {
    output += text;
  };

  // commands run one at a time so their outputs never interleave
  let queue = Promise.resolve();

  function execute(input: string): Promise<string> {
    const result = queue.then(async () => {
      output = '';
      await globalThis.kvExecute?.(input);
      return output.trimEnd();
    });
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { execute, fs };
}
