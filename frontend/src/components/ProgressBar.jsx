export default function ProgressBar({ value = 0 }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="w-full rounded-full border border-[var(--line)] bg-white/50 p-1 dark:bg-slate-900/40">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-teal-500 transition-all"
        style={{ width: `${clamped}%` }}
      />
      <p className="mt-1 text-xs text-[var(--text-muted)]">Upload: {clamped}%</p>
    </div>
  );
}
