"use client";

import * as React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import type { Id } from "../../../convex/_generated/dataModel";

export type ShoppingSuggestionRow = {
  _id: Id<"shoppingListSuggestions">;
  displayLabel: string;
};

const LOG = (...args: unknown[]) => console.log("[ShoppingCombobox]", ...args);

export function ShoppingItemCombobox({
  disabled,
  inputValue,
  onInputValueChange,
  items,
  onPickSuggestion,
  onSubmitCustom,
  placeholder,
  inputId,
}: {
  disabled?: boolean;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  items: ShoppingSuggestionRow[];
  onPickSuggestion: (label: string) => void | Promise<void>;
  onSubmitCustom: (text: string) => void | Promise<void>;
  placeholder?: string;
  inputId?: string;
}) {
  const anchorRef = useComboboxAnchor();
  const highlightedItemRef = React.useRef<ShoppingSuggestionRow | undefined>(
    undefined
  );

  LOG("render", {
    inputValue,
    itemCount: items.length,
    firstItem: items[0]?.displayLabel,
  });

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    LOG("input keydown", {
      key: event.key,
      highlighted: highlightedItemRef.current?.displayLabel,
      defaultPrevented: event.defaultPrevented,
    });
    if (event.key !== "Enter" || highlightedItemRef.current) {
      return;
    }
    const text = inputValue.trim();
    if (!text) return;
    event.preventDefault();
    void onSubmitCustom(text);
  }

  return (
    <Combobox<ShoppingSuggestionRow>
      modal={false}
      autoHighlight={"always" as unknown as boolean}
      items={items}
      filter={null}
      inputValue={inputValue}
      onInputValueChange={(value, details) => {
        LOG("onInputValueChange", { value, reason: details.reason });
        if (details.reason === "item-press") return;
        onInputValueChange(value);
      }}
      onValueChange={(item, details) => {
        LOG("onValueChange", {
          label: item?.displayLabel,
          reason: details.reason,
        });
        if (!item) return;
        void onPickSuggestion(item.displayLabel);
      }}
      onOpenChange={(open, details) => {
        LOG("onOpenChange", { open, reason: details.reason });
      }}
      onItemHighlighted={(item, details) => {
        LOG("onItemHighlighted", {
          label: item?.displayLabel,
          reason: details.reason,
          index: details.index,
        });
        const optionNodes = document.querySelectorAll('[role="option"]');
        LOG("DOM options", {
          count: optionNodes.length,
          labels: Array.from(optionNodes).map(
            (n) => (n as HTMLElement).textContent?.trim().slice(0, 20)
          ),
          firstVisible:
            optionNodes[0] != null
              ? (optionNodes[0] as HTMLElement).checkVisibility?.()
              : "n/a",
          firstConnected:
            optionNodes[0] != null ? optionNodes[0].isConnected : "n/a",
        });
        highlightedItemRef.current = item;
      }}
      autoComplete="off"
      itemToStringLabel={(row) => row.displayLabel}
    >
      <div ref={anchorRef} className="w-full">
        <ComboboxInput
          id={inputId}
          disabled={disabled}
          placeholder={placeholder ?? "Add an item…"}
          showClear={inputValue.length > 0}
          className="w-full"
          onKeyDown={handleInputKeyDown}
          onFocus={() => LOG("input focus")}
          onBlur={() => LOG("input blur")}
          onClick={() => LOG("input click")}
        />
      </div>
      <ComboboxContent
        anchor={anchorRef}
        sideOffset={6}
        className="min-w-(--anchor-width)"
      >
        <ComboboxList>
          {(item: ShoppingSuggestionRow, index: number) => (
            <ComboboxItem
              key={item._id}
              index={index}
              value={item}
              onClick={() =>
                LOG("item onClick", { label: item.displayLabel, index })
              }
              onMouseEnter={() =>
                LOG("item onMouseEnter", item.displayLabel)
              }
            >
              {item.displayLabel}
            </ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>No matching saved items.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
