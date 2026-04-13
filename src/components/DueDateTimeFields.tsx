import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function mergeCalendarDate(baseMs: number, picked: Date): number {
  const t = new Date(baseMs);
  const out = new Date(picked);
  out.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return out.getTime();
}

function applyTime(baseMs: number, hour: number, minute: number): number {
  const d = new Date(baseMs);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

export function DueDateTimeFields({
  valueMs,
  onChange,
  className,
}: {
  valueMs: number;
  onChange: (ms: number) => void;
  className?: string;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const date = new Date(valueMs);
  const hour = date.getHours();
  const minute = date.getMinutes();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-muted-foreground">Date</Label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-9 w-full justify-start pl-3 text-left font-normal",
                  !Number.isFinite(valueMs) && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                {Number.isFinite(valueMs) ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="z-[100] w-auto overflow-hidden p-0"
              align="start"
              sideOffset={4}
            >
              <Calendar
                mode="single"
                selected={Number.isFinite(valueMs) ? date : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  onChange(mergeCalendarDate(valueMs, d));
                  setCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Hour</Label>
            <Select
              value={String(hour)}
              onValueChange={(v) => {
                const h = Number(v);
                if (!Number.isInteger(h) || h < 0 || h > 23) return;
                onChange(applyTime(valueMs, h, minute));
              }}
            >
              <SelectTrigger className="h-9 font-mono tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56">
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)} className="font-mono tabular-nums">
                    {pad2(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Minute</Label>
            <Select
              value={String(minute)}
              onValueChange={(v) => {
                const m = Number(v);
                if (!Number.isInteger(m) || m < 0 || m > 59) return;
                onChange(applyTime(valueMs, hour, m));
              }}
            >
              <SelectTrigger className="h-9 font-mono tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56">
                {MINUTE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)} className="font-mono tabular-nums">
                    {pad2(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span>
          {Number.isFinite(valueMs)
            ? format(date, "EEEE, MMM d, yyyy · p")
            : "—"}
        </span>
      </p>
    </div>
  );
}
