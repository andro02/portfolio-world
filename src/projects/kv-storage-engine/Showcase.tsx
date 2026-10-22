import { Terminal } from '../../ui/terminal/Terminal';

const WELCOME = [
  'NoSQL key-value storage engine (LSM-tree), written in Go.',
  'Type "help" to see available commands.',
];

const HELP = [
  'PUT <key> <value>   store a value',
  'GET <key>           read a value',
  'DELETE <key>        delete a value (tombstone)',
  'CMS                 Count-Min Sketch frequency estimate',
  'HLL                 HyperLogLog cardinality estimate',
  'clear               clear the screen',
].join('\n');

function handleCommand(input: string): string {
  const command = input.split(/\s+/)[0].toUpperCase();

  if (command === 'HELP') return HELP;

  // temporary: the real Go engine compiled to WebAssembly is wired in next
  return 'Engine is not connected yet.';
}

// default export so the registry can lazy-load this file
export default function KvShowcase() {
  return <Terminal onCommand={handleCommand} welcome={WELCOME} />;
}
