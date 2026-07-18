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
  const [overdueEnabled, setOverdueEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStartHour, setQuietStartHour] = useState(22);
  const [quietEndHour, setQuietEndHour] = useState(7);

  useEffect(() => {
    if (!prefs || !open) return;
    setEnabled(prefs.enabled);
    setOverdueEnabled(prefs.overdueEnabled);
    setQuietHoursEnabled(prefs.quietHoursEnabled);
    setQuietStartHour(prefs.quietStartHour);
    setQuietEndHour(prefs.quietEndHour);
  }, [prefs, open]);

  async function onSave() {
    try {
      setSaving(true);
      await save({
        enabled,
        overdueEnabled,
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

          <p className="text-sm text-muted-foreground">
            Lead and overdue timing adapt to each task&apos;s frequency — for example,
            daily tasks remind about 30 minutes ahead; semi-annual tasks about 2 days
            ahead.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={overdueEnabled}
              onCheckedChange={(v) => setOverdueEnabled(!!v)}
              disabled={!enabled}
            />
            Send overdue reminders
          </label>

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
