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
    <div className={cn(className)}>
      <AvatarGroup>
        {visible.map((a) => {
          const label = a.name?.trim() || a.email || "Member";
          return (
            <AvatarGroupItem key={a.userId}>
              <Avatar size="sm" title={label}>
                {a.image ? <AvatarImage src={a.image} alt="" /> : null}
                <AvatarFallback>{getUserInitials(a.name, a.email)}</AvatarFallback>
              </Avatar>
            </AvatarGroupItem>
          );
        })}
        {overflow > 0 && (
          <AvatarGroupItem>
            <Avatar size="sm" title={`${overflow} more assignee${overflow === 1 ? "" : "s"}`}>
              <AvatarFallback>+{overflow}</AvatarFallback>
            </Avatar>
          </AvatarGroupItem>
        )}
      </AvatarGroup>
    </div>
  );
}
