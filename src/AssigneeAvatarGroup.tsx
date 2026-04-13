import type { Id } from "../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarGroup, AvatarGroupItem } from "@/components/ui/avatar-group";
import { getUserInitials } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";

export type TaskAssigneePreview = {
  userId: Id<"users">;
  name: string | null;
  email: string | null;
  image: string | null;
};

export function AssigneeAvatarGroup({
  assignees,
  max = 4,
  className,
}: {
  assignees: TaskAssigneePreview[];
  max?: number;
  className?: string;
}) {
  if (!assignees.length) return null;

  const visible = assignees.slice(0, max);
  const overflow = assignees.length - max;

  return (
    <AvatarGroup className={cn(className)}>
      {visible.map((a) => {
        const label = a.name?.trim() || a.email || "Member";
        return (
          <AvatarGroupItem key={a.userId}>
            <Avatar
              className="h-6 w-6 border-2 border-card text-[10px] shadow-sm"
              title={label}
            >
              {a.image ? <AvatarImage src={a.image} alt="" /> : null}
              <AvatarFallback className="bg-muted text-[10px] font-medium">
                {getUserInitials(a.name, a.email)}
              </AvatarFallback>
            </Avatar>
          </AvatarGroupItem>
        );
      })}
      {overflow > 0 && (
        <AvatarGroupItem>
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground shadow-sm"
            title={`${overflow} more assignee${overflow === 1 ? "" : "s"}`}
          >
            +{overflow}
          </div>
        </AvatarGroupItem>
      )}
    </AvatarGroup>
  );
}
