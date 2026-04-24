"use client";

import * as React from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export type ShoppingAutocompleteRow = {
  rowKey: string;
  displayLabel: string;
  reuseItemId?: Id<"shoppingListItems">;
};

export function ShoppingItemCombobox({
  disabled,
  inputValue,
  onInputValueChange,
  items,
  onPickSuggestion,
  onSubmitCustom,
  placeholder,
  inputId,
  children,
}: {
  disabled?: boolean;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  items: ShoppingAutocompleteRow[];
  onPickSuggestion: (row: ShoppingAutocompleteRow) => void | Promise<void>;
  onSubmitCustom: (text: string) => void | Promise<void>;
  placeholder?: string;
  inputId?: string;
  children?: React.ReactNode;
}) {
  const highlightedRef = React.useRef<ShoppingAutocompleteRow | undefined>(
    undefined
  );

  return (
    <Autocomplete.Root<ShoppingAutocompleteRow>
      items={items}
      value={inputValue}
      openOnInputClick
      itemToStringValue={(row) => row.displayLabel}
      onItemHighlighted={(item) => {
        highlightedRef.current = item;
      }}
      onValueChange={(nextValue, details) => {
        if (details.reason === "item-press") {
          const row = highlightedRef.current;
          if (row) void onPickSuggestion(row);
          return;
        }
        onInputValueChange(nextValue);
      }}
    >
      <Autocomplete.Input
        render={
          <Input
            id={inputId}
            disabled={disabled}
            placeholder={placeholder ?? "Add an item…"}
          />
        }
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.defaultPrevented) return;
          if (highlightedRef.current) return;
          const trimmed = inputValue.trim();
          if (!trimmed) return;
          event.preventDefault();
          void onSubmitCustom(trimmed);
        }}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner
          sideOffset={6}
          className="z-50 pointer-events-auto outline-none"
        >
          <Autocomplete.Popup
            className={cn(
              "pointer-events-auto max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-3xl border border-border/60 bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            )}
          >
            <Autocomplete.List className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
              {(item: ShoppingAutocompleteRow) => (
                <Autocomplete.Item
                  key={item.rowKey}
                  value={item}
                  className="relative flex w-full cursor-default items-center rounded-2xl px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {item.displayLabel}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
            <Autocomplete.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
              No matching saved items.
            </Autocomplete.Empty>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
      {children}
    </Autocomplete.Root>
  );
}
