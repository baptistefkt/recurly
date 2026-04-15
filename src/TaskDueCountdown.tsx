import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function splitDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return { days, hours, minutes, seconds };
}

function CountCell({
  value,
  label,
  overdue,
}: {
  value: number;
  label: string;
  overdue: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span
        className={cn(
          "text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
          overdue ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

export function TaskDueCountdown({
  nextDueAt,
  isArchived,
  onMarkComplete,
  busy,
}: {
  nextDueAt: number | null;
  isArchived: boolean;
  onMarkComplete: () => void | Promise<void>;
  busy?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { headline, overdue, showGrid } = useMemo(() => {
    if (nextDueAt == null) {
      return { headline: "No upcoming due date", overdue: false, showGrid: false };
    }
    const now = Date.now();
    const overdue = nextDueAt < now;
    return {
      headline: overdue ? "Overdue by" : "Due in",
      overdue,
      showGrid: true,
    };
  }, [nextDueAt, tick]);

  const liveParts = useMemo(() => {
    if (nextDueAt == null) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return splitDuration(Math.abs(nextDueAt - Date.now()));
  }, [nextDueAt, tick]);

  if (isArchived) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">
          This task is archived. Restore it from the bar below to track time until the next due date.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-5 sm:py-6">
      <h2 className="mb-4 text-center text-lg font-semibold tracking-tight text-foreground sm:mb-5 sm:text-xl">
        {headline}
      </h2>

      {showGrid && (
        <div
          className="mb-5 flex w-full max-w-md justify-between gap-1.5 px-1 sm:mb-6 sm:max-w-lg sm:gap-3"
          aria-live="polite"
        >
          <CountCell value={liveParts.days} label="Days" overdue={overdue} />
          <CountCell value={liveParts.hours} label="Hours" overdue={overdue} />
          <CountCell value={liveParts.minutes} label="Minutes" overdue={overdue} />
          <CountCell value={liveParts.seconds} label="Seconds" overdue={overdue} />
        </div>
      )}

      {!showGrid && (
        <p className="mb-5 max-w-md text-center text-sm text-muted-foreground sm:mb-6">
          Complete this task anytime, or edit it to set a recurrence so a due date appears here.
        </p>
      )}

      <div className="w-full max-w-sm [&>button]:w-full">
        <Button
          type="button"
          disabled={busy}
          onClick={() => void onMarkComplete()}
        >
          Mark complete
        </Button>
      </div>
    </div>
  );
}
