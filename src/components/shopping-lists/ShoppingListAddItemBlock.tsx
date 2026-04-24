import {
  ShoppingItemCombobox,
  type ShoppingAutocompleteRow,
} from "@/components/shopping/ShoppingItemCombobox";
import { Label } from "@/components/ui/label";
import type { Id } from "../../../convex/_generated/dataModel";
import { AmbiguousItemMatchBanner, type AmbiguousMatch } from "./AmbiguousItemMatchBanner";

export function ShoppingListAddItemBlock({
  listId,
  addDraft,
  onAddDraftChange,
  suggestionRows,
  onPickSuggestion,
  onSubmitCustom,
  ambiguous,
  onAmbiguousAcceptReuse,
  onAmbiguousKeepOriginal,
}: {
  listId: Id<"shoppingLists"> | null;
  addDraft: string;
  onAddDraftChange: (v: string) => void;
  suggestionRows: ShoppingAutocompleteRow[];
  onPickSuggestion: (row: ShoppingAutocompleteRow) => Promise<void>;
  onSubmitCustom: (text: string) => Promise<void>;
  ambiguous: AmbiguousMatch | null;
  onAmbiguousAcceptReuse: () => Promise<void>;
  onAmbiguousKeepOriginal: () => Promise<void>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="shopping-list-add-item" className="text-xs text-muted-foreground">
        Add item
      </Label>
      <div className="px-1 pb-1">
        <ShoppingItemCombobox
          inputId="shopping-list-add-item"
          disabled={!listId}
          inputValue={addDraft}
          onInputValueChange={onAddDraftChange}
          items={suggestionRows}
          onPickSuggestion={onPickSuggestion}
          onSubmitCustom={onSubmitCustom}
          placeholder="Search suggestions or type a new item…"
        >
          {ambiguous ? (
            <AmbiguousItemMatchBanner
              label={ambiguous.label}
              onAcceptReuse={onAmbiguousAcceptReuse}
              onKeepOriginal={onAmbiguousKeepOriginal}
            />
          ) : null}
        </ShoppingItemCombobox>
      </div>
    </div>
  );
}
