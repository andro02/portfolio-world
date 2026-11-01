import { useRef, useState, type DragEvent } from 'react';
import { formatSize } from '../cloud/aws';
import type { FileInfo } from '../cloud/lambdas';

// A drop zone instead of the browser's own file input: click to choose a
// video, or drag one onto it. The real input stays inside it (hidden), so
// the keyboard and screen readers still work as usual.

interface FilePickerProps {
  file: FileInfo | null;
  onChange: (file: FileInfo | null) => void;
  hint?: string; // shown while no file is chosen
}

export function FilePicker({ file, onChange, hint = 'MP4, MKV, MOV, WebM…' }: FilePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (chosen: File | undefined) => {
    onChange(chosen ? { name: chosen.name, size: chosen.size, type: chosen.type } : null);
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files[0]);
  };

  return (
    <div
      className="mc-file"
      data-dragging={dragging}
      data-chosen={Boolean(file)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <input
        ref={input}
        id="mc-film-file"
        type="file"
        accept="video/*"
        className="mc-file-input"
        onChange={(event) => take(event.target.files?.[0])}
      />
      <label htmlFor="mc-film-file" className="mc-file-zone">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {file ? (
            // a film frame
            <path d="M4 5h16v14H4zM4 9h16M4 15h16M8 5v4M12 5v4M16 5v4M8 15v4M12 15v4M16 15v4" />
          ) : (
            // an arrow going up into a tray
            <path d="M12 15V4M7 9l5-5 5 5M4 15v4h16v-4" />
          )}
        </svg>
        {file ? (
          <span className="mc-file-text">
            <strong>{file.name}</strong>
            <small>
              {formatSize(file.size)}
              {file.type ? ` · ${file.type}` : ''}
            </small>
          </span>
        ) : (
          <span className="mc-file-text">
            <strong>{dragging ? 'Drop it here' : 'Choose a video'}</strong>
            <small>or drag it here · {hint}</small>
          </span>
        )}
      </label>
      {file && (
        <button
          type="button"
          className="mc-file-clear"
          onClick={() => {
            if (input.current) input.current.value = '';
            onChange(null);
          }}
          aria-label="Remove the file"
          title="Remove the file"
        >
          ×
        </button>
      )}
    </div>
  );
}
