import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PendingInvitesBanner() {
  const invites = useQuery(api.invites.listPendingForMe);
  const accept = useMutation(api.invites.acceptInvite);

  if (!invites?.length) return null;

  return (
    <Card className="border-indigo-200 bg-indigo-50 shadow-none dark:border-indigo-900/50 dark:bg-indigo-950/40">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base text-indigo-900 dark:text-indigo-100">Team invites</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <ul className="space-y-2 text-sm">
          {invites.map((inv) => (
            <li key={inv._id} className="flex items-center justify-between gap-2">
              <span className="text-indigo-900 dark:text-indigo-100">
                Join <strong>{inv.teamName}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={async () => {
                  try {
                    await accept({ inviteId: inv._id });
                    toast.success(`Joined ${inv.teamName}`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not accept");
                  }
                }}
              >
                Accept
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
