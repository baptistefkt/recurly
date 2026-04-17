const AVATAR_FALLBACK_CLASSNAMES = [
  "bg-slate-200 text-foreground dark:bg-slate-800 dark:text-foreground",
  "bg-zinc-200 text-foreground dark:bg-zinc-800 dark:text-foreground",
  "bg-stone-200 text-foreground dark:bg-stone-800 dark:text-foreground",
  "bg-gray-200 text-foreground dark:bg-gray-800 dark:text-foreground",
  "bg-blue-100 text-foreground dark:bg-blue-900 dark:text-foreground",
  "bg-indigo-100 text-foreground dark:bg-indigo-900 dark:text-foreground",
  "bg-violet-100 text-foreground dark:bg-violet-900 dark:text-foreground",
  "bg-emerald-100 text-foreground dark:bg-emerald-900 dark:text-foreground",
  "bg-teal-100 text-foreground dark:bg-teal-900 dark:text-foreground",
  "bg-amber-100 text-foreground dark:bg-amber-900 dark:text-foreground",
] as const;

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function avatarFallbackColorClass(seed: string): string {
  const normalized = seed.trim().toLowerCase();
  if (!normalized) return AVATAR_FALLBACK_CLASSNAMES[0];
  return AVATAR_FALLBACK_CLASSNAMES[hashSeed(normalized) % AVATAR_FALLBACK_CLASSNAMES.length];
}
