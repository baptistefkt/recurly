import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReminderSettingsModal({ open, onOpenChange }: Props) {
  const prefs = useQuery(api.notifications.reminderPreferences.getMyReminderPreferences, {});
  const save = useMutation(api.notifications.reminderPreferences.updateMyReminderPreferences);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [dueSoonMinutes, setDueSoonMinutes] = useState(30);
  const [overdueEnabled, setOverdueEnabled] = useState(true);
  const [overdueDelayMinutes, setOverdueDelayMinutes] = useState(30);
  const [maxOverdueHours, setMaxOverdueHours] = useState(24);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStartHour, setQuietStartHour] = useState(22);
  const [quietEndHour, setQuietEndHour] = useState(7);

  useEffect(() => {
    if (!prefs || !open) return;
    setEnabled(prefs.enabled);
    setDueSoonMinutes(prefs.dueSoonMinutes);
    setOverdueEnabled(prefs.overdueEnabled);
    setOverdueDelayMinutes(prefs.overdueDelayMinutes);
    setMaxOverdueHours(prefs.maxOverdueHours);
    setQuietHoursEnabled(prefs.quietHoursEnabled);
    setQuietStartHour(prefs.quietStartHour);
    setQuietEndHour(prefs.quietEndHour);
  }, [prefs, open]);

  async function onSave() {
    try {
      setSaving(true);
      await save({
        enabled,
        dueSoonMinutes,
        overdueEnabled,
        overdueDelayMinutes,
        maxOverdueHours,
        quietHoursEnabled,
        quietStartHour,
        quietEndHour,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });
      toast.success("Reminder settings saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reminder Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
            Enable push reminders
          </label>

          <div className="space-y-2">
            <Label htmlFor="due-soon-minutes">Due soon lead time (minutes)</Label>
            <Input
              id="due-soon-minutes"
              type="number"
              min={5}
              max={240}
              value={dueSoonMinutes}
              onChange={(e) => setDueSoonMinutes(Math.max(5, Number(e.target.value) || 5))}
              disabled={!enabled}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={overdueEnabled}
              onCheckedChange={(v) => setOverdueEnabled(!!v)}
              disabled={!enabled}
            />
            Send overdue reminders
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="overdue-delay">Overdue delay (minutes)</Label>
              <Input
                id="overdue-delay"
                type="number"
                min={0}
                max={1440}
                value={overdueDelayMinutes}
                onChange={(e) =>
                  setOverdueDelayMinutes(Math.max(0, Number(e.target.value) || 0))
                }
                disabled={!enabled || !overdueEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-overdue-hours">Overdue window (hours)</Label>
              <Input
                id="max-overdue-hours"
                type="number"
                min={1}
                max={168}
                value={maxOverdueHours}
                onChange={(e) =>
                  setMaxOverdueHours(Math.max(1, Number(e.target.value) || 1))
                }
                disabled={!enabled || !overdueEnabled}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={quietHoursEnabled}
              onCheckedChange={(v) => setQuietHoursEnabled(!!v)}
              disabled={!enabled}
            />
            Enable quiet hours
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Quiet start (hour 0-23)</Label>
              <Input
                id="quiet-start"
                type="number"
                min={0}
                max={23}
                value={quietStartHour}
                onChange={(e) =>
                  setQuietStartHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))
                }
                disabled={!enabled || !quietHoursEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Quiet end (hour 0-23)</Label>
              <Input
                id="quiet-end"
                type="number"
                min={0}
                max={23}
                value={quietEndHour}
                onChange={(e) =>
                  setQuietEndHour(Math.min(23, Math.max(0, Number(e.target.value) || 0)))
                }
                disabled={!enabled || !quietHoursEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
