import { useMutation, useQuery } from "convex/react";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { api } from "../../convex/_generated/api";
import { DISPLAY_NAME_MAX_LEN } from "../../convex/displayNameLimits";
import { UserMenu } from "@/components/user/UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettingsPage() {
  const [, navigate] = useLocation();
  const user = useQuery(api.auth.loggedInUser);
  const updateDisplayName = useMutation(api.users.updateMyDisplayName);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user === undefined) return;
    setDraft(user?.name?.trim() ?? "");
  }, [user]);

  const email = user?.email?.trim() ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 px-2"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="h-4 w-4" />
              Tasks
            </Button>
            <span className="truncate font-semibold text-foreground">Account</span>
          </div>
          <UserMenu
            user={user ?? undefined}
            onAddTask={() => navigate("/")}
            onNewTeam={() => navigate("/")}
            onReminderSettings={() => navigate("/")}
            onOpenAccountSettings={() => navigate("/settings")}
            onOpenStats={() => navigate("/stats")}
            onOpenLists={() => navigate("/lists")}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Display name</CardTitle>
            <CardDescription>
              Optional. When set, teammates and shared task views show this instead of your email.
              Your sign-in email does not change.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-form-field">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" type="email" value={email} disabled readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-display-name">Display name</Label>
              <Input
                id="account-display-name"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={DISPLAY_NAME_MAX_LEN}
                placeholder="How you appear in the app"
                autoComplete="name"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to show your email everywhere. Up to {DISPLAY_NAME_MAX_LEN} characters.
              </p>
            </div>
            <Button
              type="button"
              disabled={saving || user === undefined}
              onClick={() => {
                setSaving(true);
                const trimmed = draft.trim();
                void updateDisplayName({ displayName: trimmed.length ? trimmed : undefined })
                  .then(() => {
                    toast.success("Display name saved");
                  })
                  .catch((err: unknown) => {
                    toast.error(err instanceof Error ? err.message : "Could not save");
                  })
                  .finally(() => setSaving(false));
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
