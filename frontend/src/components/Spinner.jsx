export default function Spinner({ label = 'Processing...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent dark:border-teal-300" />
      <span>{label}</span>
    </div>
  );
}
