const TAG_COLOR_CLASSNAMES = [
  "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200",
  "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-950/40 dark:text-lime-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-200",
  "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200",
  "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200",
  "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-200",
  "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200",
  "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
] as const;

function hashTag(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function tagColorClass(tag: string): string {
  const normalized = tag.trim().toLowerCase();
  const colorClass =
    TAG_COLOR_CLASSNAMES[
      normalized ? hashTag(normalized) % TAG_COLOR_CLASSNAMES.length : 0
    ];
  return `border-transparent ${colorClass}`;
}
