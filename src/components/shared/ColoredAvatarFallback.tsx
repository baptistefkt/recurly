import { AvatarFallback } from "@/components/ui/avatar";
import { avatarFallbackColorClass } from "@/lib/avatarColors";
import { cn } from "@/lib/utils";

export function ColoredAvatarFallback({
  seed,
  className,
  children,
}: {
  seed: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AvatarFallback className={cn(avatarFallbackColorClass(seed), className)}>
      {children}
    </AvatarFallback>
  );
}
