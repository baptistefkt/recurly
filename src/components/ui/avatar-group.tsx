import * as React from "react";
import { cn } from "@/lib/utils";

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function AvatarGroupItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="listitem"
      className={cn(
        "relative shrink-0 [&:not(:first-child)]:-ml-2 rtl:[&:not(:first-child)]:-mr-2 rtl:[&:not(:first-child)]:ml-0",
        className
      )}
      {...props}
    />
  );
}

export { AvatarGroup, AvatarGroupItem };
