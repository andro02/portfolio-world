import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

// receives a command line and returns the text to print (can be async)
export type CommandHandler = (input: string) => string | Promise<string>;

interface TerminalProps {
  onCommand: CommandHandler;
  welcome?: string[];
  prompt?: string;
}

interface Line {
  id: number;
  kind: 'input' | 'output';
  text: string;
}

export function Terminal({ onCommand, welcome = [], prompt = '>>> ' }: TerminalProps) {
  const [lines, setLines] = useState<Line[]>(() =>
    welcome.map((text, index) => ({ id: index, kind: 'output', text })),
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const nextId = useRef(welcome.length);
  const history = useRef<string[]>([]);
  const historyIndex = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // keep the newest line in view; only the terminal itself scrolls, not the
  // panel around it
  useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [lines]);

  // focus the input as soon as the terminal appears, without scrolling the page to it
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  function append(kind: Line['kind'], text: string) {
    const id = nextId.current++;
    setLines((previous) => [...previous, { id, kind, text }]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    setInput('');
    if (!command || busy) return;

    history.current.push(command);
    historyIndex.current = history.current.length;

    // built-in command, handled by the terminal itself
    if (command === 'clear') {
      setLines([]);
      return;
    }

    append('input', command);
    setBusy(true);
    try {
      const output = await onCommand(command);
      if (output) append('output', output);
    } catch (error) {
      append('output', `Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  // navigate previous commands with arrow keys, like a real shell
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (historyIndex.current > 0) {
        historyIndex.current -= 1;
        setInput(history.current[historyIndex.current]);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex.current < history.current.length - 1) {
        historyIndex.current += 1;
        setInput(history.current[historyIndex.current]);
      } else {
        historyIndex.current = history.current.length;
        setInput('');
      }
    }
  }

  return (
    // clicking anywhere in the terminal focuses the input
    <div
      ref={containerRef}
      className="terminal"
      onClick={() => inputRef.current?.focus({ preventScroll: true })}
    >
      {lines.map((line) => (
        <pre key={line.id} className={`terminal-line terminal-${line.kind}`}>
          {line.kind === 'input' ? prompt + line.text : line.text}
        </pre>
      ))}

      <form className="terminal-input-row" onSubmit={handleSubmit}>
        <span className="terminal-prompt">{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={busy}
          spellCheck={false}
          autoComplete="off"
          aria-label="Terminal input"
        />
      </form>
    </div>
  );
}
