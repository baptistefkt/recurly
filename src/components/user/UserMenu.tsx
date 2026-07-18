import { useAuthActions } from "@convex-dev/auth/react";
import { BarChart3, Bell, ListChecks, LogOut, Plus, Settings, Users } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ColoredAvatarFallback } from "@/components/shared/ColoredAvatarFallback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserInitials } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";

type UserFields = {
  _id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function UserMenu({
  user,
  onAddTask,
  onNewTeam,
  onReminderSettings,
  onOpenAccountSettings,
  onOpenStats,
  onOpenLists,
  className,
}: {
  user: UserFields | null | undefined;
  onAddTask: () => void;
  onNewTeam: () => void;
  onReminderSettings: () => void;
  onOpenAccountSettings: () => void;
  onOpenStats: () => void;
  onOpenLists: () => void;
  className?: string;
}) {
  const { signOut } = useAuthActions();
  const initials = getUserInitials(user?.name, user?.email);
  const display = user?.name?.trim() || user?.email || "Account";
  const avatarSeed = user?._id || user?.email || display;

  return (
    <DropdownMenu>
      <div className={cn("relative", className)}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open account menu">
            <Avatar size="lg">
              {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
              <ColoredAvatarFallback seed={avatarSeed}>
                {initials}
              </ColoredAvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium leading-none">{display}</p>
          {user?.email && user.name ? (
            <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddTask}>
          <Plus />
          Add task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewTeam}>
          <Users />
          New team
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenAccountSettings}>
          <Settings />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReminderSettings}>
          <Bell />
          Reminder settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenStats}>
          <BarChart3 />
          Stats
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenLists}>
          <ListChecks />
          Lists
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
