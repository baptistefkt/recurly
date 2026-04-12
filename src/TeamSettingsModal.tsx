import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function TeamSettingsModal({
  teamId,
  teamName,
  isAdmin,
  onClose,
}: {
  teamId: Id<"teams">;
  teamName: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const members = useQuery(api.teams.members, { teamId });
  const pendingInvites = useQuery(api.invites.listPendingForTeam, isAdmin ? { teamId } : "skip");
  const createInvite = useMutation(api.invites.createInvite);
  const revokeInvite = useMutation(api.invites.revokeInvite);
  const removeMember = useMutation(api.teams.removeMember);
  const deleteTeam = useMutation(api.teams.deleteTeam);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{
    userId: Id<"users">;
    label: string;
  } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await createInvite({ teamId, email: email.trim() });
      toast.success("Invite sent");
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTeam() {
    setBusy(true);
    setDeleteTeamOpen(false);
    try {
      await deleteTeam({ teamId });
      toast.success("Team deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmRemoveMember() {
    if (!removeMemberTarget) return;
    setBusy(true);
    try {
      await removeMember({ teamId, memberUserId: removeMemberTarget.userId });
      toast.success("Removed");
      setRemoveMemberTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="space-y-0 border-b px-5 pb-3 pt-5 text-left">
            <DialogTitle>{teamName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <section>
              <h3 className="mb-2 text-sm font-medium text-foreground">Members</h3>
              {!members ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-0">
                  {members.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                    >
                      <div>
                        <span className="text-foreground">{m.name || m.email || m.userId}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {m.role === "admin" ? "Admin" : "Member"}
                        </span>
                      </div>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-destructive"
                          onClick={() =>
                            setRemoveMemberTarget({
                              userId: m.userId,
                              label: m.name || m.email || "this member",
                            })
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {isAdmin && (
              <>
                <Separator />
                <section>
                  <h3 className="mb-2 text-sm font-medium text-foreground">Invite by email</h3>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={busy || !email.trim()}>
                      Invite
                    </Button>
                  </form>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-medium text-foreground">Pending invites</h3>
                  {!pendingInvites?.length ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-2">
                      {pendingInvites.map((inv) => (
                        <li key={inv._id} className="flex items-center justify-between py-1 text-sm">
                          <span className="text-foreground">{inv.email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              try {
                                await revokeInvite({ inviteId: inv._id });
                                toast.success("Revoked");
                              } catch {
                                toast.error("Failed");
                              }
                            }}
                          >
                            Revoke
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Separator />
                <section>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-destructive"
                    onClick={() => setDeleteTeamOpen(true)}
                  >
                    Delete team…
                  </Button>
                </section>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all team tasks and completions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void handleDeleteTeam()}>
              Delete team
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!removeMemberTarget}
        onOpenChange={(open) => { if (!open) setRemoveMemberTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeMemberTarget?.label} from this team? They will lose access to team tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void handleConfirmRemoveMember()}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
