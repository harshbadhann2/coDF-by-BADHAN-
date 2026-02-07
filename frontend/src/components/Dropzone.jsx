import { useRef, useState } from 'react';

export default function Dropzone({ accept, file, onFileSelect, helpText }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function pickFile(event) {
    const selected = event.target.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragOver(false);

    const selected = event.dataTransfer.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 transition ${
        isDragOver
          ? 'border-teal-500 bg-teal-100/50 dark:bg-teal-950/40'
          : 'border-[var(--line)] bg-white/60 dark:bg-slate-900/40'
      }`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          inputRef.current?.click();
        }
      }}
    >
      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={pickFile} />
      <p className="text-sm font-medium text-[var(--text-main)]">Drop file here or click to browse</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{helpText}</p>
      {file && <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">Selected: {file.name}</p>}
    </div>
  );
}
