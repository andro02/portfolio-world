// In-memory file system with the subset of the Node.js `fs` callback API
// that Go's WebAssembly runtime uses for file operations (see syscall/fs_js.go).

type Callback<T = unknown> = (error: FsError | null, result?: T) => void;

interface FileNode {
  kind: 'file';
  data: Uint8Array;
  size: number; // bytes in use; `data` may be larger to allow cheap appends
  mtimeMs: number;
}

interface DirNode {
  kind: 'dir';
  children: Map<string, Node>;
  mtimeMs: number;
}

type Node = FileNode | DirNode;

interface OpenFile {
  node: Node;
  position: number;
  append: boolean;
}

// Go maps these error codes to its own errno values
class FsError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}

const S_IFDIR = 0o040000;
const S_IFREG = 0o100000;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export class MemoryFileSystem {
  // Linux flag values; Go reads them from here when opening files
  readonly constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    O_CREAT: 64,
    O_EXCL: 128,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536, // os.ReadDir opens directories with this flag
  };

  private readonly root: DirNode = { kind: 'dir', children: new Map(), mtimeMs: Date.now() };
  private readonly openFiles = new Map<number, OpenFile>();
  private nextFd = 3; // 0, 1 and 2 are stdin, stdout and stderr

  // receives everything the program prints to stdout and stderr
  onOutput: (text: string) => void = () => {};

  // ---- helpers for the page (synchronous, not part of the Node API) ----

  writeFile(path: string, content: string | Uint8Array): void {
    const data = typeof content === 'string' ? textEncoder.encode(content) : content;
    const { parent, name } = this.resolveParent(path);
    parent.children.set(name, { kind: 'file', data, size: data.length, mtimeMs: Date.now() });
  }

  mkdirSync(path: string): void {
    const { parent, name } = this.resolveParent(path);
    if (!parent.children.has(name)) {
      parent.children.set(name, { kind: 'dir', children: new Map(), mtimeMs: Date.now() });
    }
  }

  // lists a directory as [name, size] pairs, size is null for directories
  list(path: string): [string, number | null][] {
    const node = this.lookup(path);
    if (node?.kind !== 'dir') throw new FsError('ENOTDIR', path);
    return [...node.children.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, child]) => [name, child.kind === 'file' ? child.size : null]);
  }

  // ---- Node.js fs callback API used by Go ----

  open(path: string, flags: number, _mode: number, callback: Callback<number>): void {
    this.run(callback, () => {
      const { O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_DIRECTORY } = this.constants;
      let node = this.lookup(path);

      if (node && flags & O_CREAT && flags & O_EXCL) throw new FsError('EEXIST', path);
      if (!node) {
        if (!(flags & O_CREAT)) throw new FsError('ENOENT', path);
        const { parent, name } = this.resolveParent(path);
        node = { kind: 'file', data: new Uint8Array(0), size: 0, mtimeMs: Date.now() };
        parent.children.set(name, node);
      }
      if (node.kind === 'file' && flags & O_DIRECTORY) throw new FsError('ENOTDIR', path);
      if (node.kind === 'file' && flags & O_TRUNC) node.size = 0;

      const fd = this.nextFd++;
      this.openFiles.set(fd, { node, position: 0, append: Boolean(flags & O_APPEND) });
      return fd;
    });
  }

  close(fd: number, callback: Callback): void {
    this.run(callback, () => {
      this.openFiles.delete(fd);
    });
  }

  read(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: Callback<number>,
  ): void {
    this.run(callback, () => {
      const file = this.getOpenFile(fd);
      if (file.node.kind !== 'file') throw new FsError('EISDIR', `fd ${fd}`);

      const start = position ?? file.position;
      const count = Math.max(0, Math.min(length, file.node.size - start));
      buffer.set(file.node.data.subarray(start, start + count), offset);

      if (position === null) file.position += count;
      return count;
    });
  }

  write(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: Callback<number>,
  ): void {
    this.run(callback, () => {
      const chunk = buffer.subarray(offset, offset + length);
      if (fd === 1 || fd === 2) {
        this.onOutput(textDecoder.decode(chunk));
        return length;
      }

      const file = this.getOpenFile(fd);
      const node = file.node;
      if (node.kind !== 'file') throw new FsError('EISDIR', `fd ${fd}`);

      const start = file.append ? node.size : (position ?? file.position);
      ensureCapacity(node, start + length);
      node.data.set(chunk, start);
      node.size = Math.max(node.size, start + length);
      node.mtimeMs = Date.now();

      if (position === null) file.position = start + length;
      return length;
    });
  }

  // used by the Go runtime itself, e.g. to print panic messages
  writeSync(fd: number, buffer: Uint8Array): number {
    if (fd === 1 || fd === 2) this.onOutput(textDecoder.decode(buffer));
    return buffer.length;
  }

  fstat(fd: number, callback: Callback): void {
    this.run(callback, () => toStats(this.getOpenFile(fd).node));
  }

  stat(path: string, callback: Callback): void {
    this.run(callback, () => toStats(this.lookupOrThrow(path)));
  }

  lstat(path: string, callback: Callback): void {
    this.stat(path, callback);
  }

  readdir(path: string, callback: Callback<string[]>): void {
    this.run(callback, () => {
      const node = this.lookupOrThrow(path);
      if (node.kind !== 'dir') throw new FsError('ENOTDIR', path);
      return [...node.children.keys()];
    });
  }

  mkdir(path: string, _mode: number, callback: Callback): void {
    this.run(callback, () => {
      if (this.lookup(path)) throw new FsError('EEXIST', path);
      this.mkdirSync(path);
    });
  }

  rmdir(path: string, callback: Callback): void {
    this.run(callback, () => {
      const node = this.lookupOrThrow(path);
      if (node.kind !== 'dir') throw new FsError('ENOTDIR', path);
      if (node.children.size > 0) throw new FsError('ENOTEMPTY', path);
      this.removeEntry(path);
    });
  }

  unlink(path: string, callback: Callback): void {
    this.run(callback, () => {
      if (this.lookupOrThrow(path).kind === 'dir') throw new FsError('EISDIR', path);
      this.removeEntry(path);
    });
  }

  rename(from: string, to: string, callback: Callback): void {
    this.run(callback, () => {
      const node = this.lookupOrThrow(from);
      this.removeEntry(from);
      const { parent, name } = this.resolveParent(to);
      parent.children.set(name, node);
    });
  }

  ftruncate(fd: number, length: number, callback: Callback): void {
    this.run(callback, () => {
      const node = this.getOpenFile(fd).node;
      if (node.kind !== 'file') throw new FsError('EISDIR', `fd ${fd}`);
      ensureCapacity(node, length);
      node.data.fill(0, node.size, length);
      node.size = length;
    });
  }

  fsync(_fd: number, callback: Callback): void {
    this.run(callback, () => undefined);
  }

  // ---- internals ----

  // runs an operation and reports its result asynchronously, like Node does
  private run<T>(callback: Callback<T>, operation: () => T): void {
    let result: T;
    try {
      result = operation();
    } catch (error) {
      const fsError = error instanceof FsError ? error : new FsError('EIO', String(error));
      queueMicrotask(() => callback(fsError));
      return;
    }
    queueMicrotask(() => callback(null, result));
  }

  private getOpenFile(fd: number): OpenFile {
    const file = this.openFiles.get(fd);
    if (!file) throw new FsError('EBADF', `fd ${fd}`);
    return file;
  }

  private lookup(path: string): Node | undefined {
    let node: Node = this.root;
    for (const part of splitPath(path)) {
      if (node.kind !== 'dir') return undefined;
      const child = node.children.get(part);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }

  private lookupOrThrow(path: string): Node {
    const node = this.lookup(path);
    if (!node) throw new FsError('ENOENT', path);
    return node;
  }

  private resolveParent(path: string): { parent: DirNode; name: string } {
    const parts = splitPath(path);
    const name = parts.pop();
    if (!name) throw new FsError('EINVAL', path);

    const parent = this.lookup(parts.join('/'));
    if (!parent) throw new FsError('ENOENT', path);
    if (parent.kind !== 'dir') throw new FsError('ENOTDIR', path);
    return { parent, name };
  }

  private removeEntry(path: string): void {
    const { parent, name } = this.resolveParent(path);
    parent.children.delete(name);
  }
}

// normalizes "//logs/./wal.log" into ["logs", "wal.log"]
function splitPath(path: string): string[] {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts;
}

// grows the file buffer geometrically so repeated appends stay cheap
function ensureCapacity(node: FileNode, required: number): void {
  if (required <= node.data.length) return;
  const grown = new Uint8Array(Math.max(required, node.data.length * 2, 64));
  grown.set(node.data.subarray(0, node.size));
  node.data = grown;
}

function toStats(node: Node) {
  const isDirectory = node.kind === 'dir';
  const size = node.kind === 'file' ? node.size : 0;
  const time = Math.floor(node.mtimeMs);
  return {
    dev: 0,
    ino: 0,
    mode: isDirectory ? S_IFDIR | 0o755 : S_IFREG | 0o644,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    size,
    blksize: 4096,
    blocks: Math.ceil(size / 512),
    atimeMs: time,
    mtimeMs: time,
    ctimeMs: time,
    isDirectory: () => isDirectory,
  };
}
