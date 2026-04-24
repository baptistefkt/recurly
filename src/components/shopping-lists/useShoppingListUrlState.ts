import { useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import type { PreviewRow } from "./listsPageUtils";
import { parseListIdFromSearch } from "./listsPageUtils";
import type { Id } from "../../../convex/_generated/dataModel";

export function useShoppingListUrlState(previews: PreviewRow[] | undefined) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const listIdParam = parseListIdFromSearch(search);

  const openList = useCallback(
    (id: Id<"shoppingLists">) => {
      navigate(`/lists?list=${id}`);
    },
    [navigate]
  );

  const closeList = useCallback(() => {
    navigate("/lists");
  }, [navigate]);

  useEffect(() => {
    if (previews === undefined || !listIdParam) return;
    const ok = previews.some((p) => p.list._id === listIdParam);
    if (!ok) {
      toast.error("List not found");
      navigate("/lists");
    }
  }, [listIdParam, previews, navigate]);

  return { listIdParam, openList, closeList, navigate };
}
