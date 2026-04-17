import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PendingInvitesBanner() {
  const invites = useQuery(api.invites.listPendingForMe);
  const accept = useMutation(api.invites.acceptInvite);

  if (!invites?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team invites</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {invites.map((inv) => (
            <li key={inv._id} className="flex items-center justify-between gap-2">
              <span>
                Join <strong>{inv.teamName}</strong>
              </span>
              <Button
                type="button"
                size="sm"
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
