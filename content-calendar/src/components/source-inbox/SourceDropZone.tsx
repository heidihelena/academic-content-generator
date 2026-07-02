import { useRef, useState } from 'react';

/**
 * Drag-and-drop (or click-to-pick) import for source files. Files are read in
 * the browser — nothing is uploaded off this computer.
 */
export function SourceDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      data-testid="source-dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-lg border border-dashed px-3 py-3 text-center transition-colors ${
        over ? 'border-brand-500/70 bg-brand-500/5' : 'border-surface-600 bg-surface-800/30'
      }`}
    >
      <p className="text-xs text-slate-400">
        Drop papers, notes or manuscripts here (.md, .txt, .pdf) —{' '}
        <button type="button" className="text-brand-400 underline-offset-2 hover:underline" onClick={() => inputRef.current?.click()}>
          or choose files
        </button>
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">Files are read locally and never leave this computer.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.txt,.pdf"
        multiple
        className="hidden"
        aria-label="Choose source files"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}
