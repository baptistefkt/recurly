import { ChevronLeft } from "lucide-react";
import { UserMenu } from "@/components/user/UserMenu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type UserFields = {
  _id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function ShoppingListsPageHeader({
  user,
  navigate,
  onOpenAccountSettings,
}: {
  user: UserFields | null | undefined;
  navigate: (to: string) => void;
  onOpenAccountSettings: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src="/icon-192.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-lg object-cover"
          />
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
          <Separator orientation="vertical" className="h-6" />
          <span className="truncate font-semibold text-foreground">Shopping lists</span>
        </div>
        <UserMenu
          user={user ?? undefined}
          onAddTask={() => navigate("/")}
          onNewTeam={() => navigate("/")}
          onReminderSettings={() => navigate("/")}
          onOpenAccountSettings={onOpenAccountSettings}
          onOpenStats={() => navigate("/stats")}
          onOpenLists={() => navigate("/lists")}
        />
      </div>
    </header>
  );
}
