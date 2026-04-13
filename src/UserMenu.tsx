import { useAuthActions } from "@convex-dev/auth/react";
import { Bell, LogOut, Plus, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function UserMenu({
  user,
  onAddTask,
  onNewTeam,
  onReminderSettings,
  className,
}: {
  user: UserFields | null | undefined;
  onAddTask: () => void;
  onNewTeam: () => void;
  onReminderSettings: () => void;
  className?: string;
}) {
  const { signOut } = useAuthActions();
  const initials = getUserInitials(user?.name, user?.email);
  const display = user?.name?.trim() || user?.email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-9 w-9 rounded-full p-0", className)}
          aria-label="Open account menu"
        >
          <Avatar className="h-9 w-9">
            {user?.image ? (
              <AvatarImage src={user.image} alt="" className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-sm font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
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
        <DropdownMenuItem onClick={onReminderSettings}>
          <Bell />
          Reminder settings
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
