import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import autoAnimate from "@formkit/auto-animate";
import { ShoppingItemCombobox } from "@/components/shopping/ShoppingItemCombobox";
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ListChecks,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { UserMenu } from "@/components/user/UserMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function parseListIdFromSearch(search: string): Id<"shoppingLists"> | null {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const id = new URLSearchParams(q).get("list");
  if (!id) return null;
  return id as Id<"shoppingLists">;
}

type PreviewRow = {
  list: {
    _id: Id<"shoppingLists">;
    title: string;
    teamId?: Id<"teams">;
    isArchived?: boolean;
  };
  previewItems: { _id: Id<"shoppingListItems">; text: string; completed: boolean }[];
  totalItemCount: number;
};

function previewLineClass(index: number): string {
  if (index < 5) return "";
  if (index < 8) return "hidden sm:block";
  if (index < 10) return "hidden lg:block";
  return "hidden xl:block";
}

export function ListsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const listIdParam = parseListIdFromSearch(search);

  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newScope, setNewScope] = useState<"personal" | Id<"teams">>("personal");
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [editingItemId, setEditingItemId] = useState<Id<"shoppingListItems"> | null>(null);
  const [editText, setEditText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const animatedItemsListRef = useRef<WeakSet<HTMLElement>>(new WeakSet());

  const attachItemsListAnimation = useCallback((element: HTMLElement | null) => {
    if (!element || animatedItemsListRef.current.has(element)) return;
    autoAnimate(element, { duration: 200, easing: "ease-out" });
    animatedItemsListRef.current.add(element);
  }, []);

  const user = useQuery(api.auth.loggedInUser);
  const memberships = useQuery(api.teams.myMemberships, {});
  const previews = useQuery(api.shoppingLists.listMinePreviews, {
    includeArchived: showArchived,
    previewLimit: 12,
  });

  const selectedList = useQuery(
    api.shoppingLists.get,
    listIdParam ? { listId: listIdParam } : "skip"
  );
  const items = useQuery(
    api.shoppingLists.listItems,
    listIdParam ? { listId: listIdParam } : "skip"
  );
  const suggestions = useQuery(
    api.shoppingLists.listSuggestions,
    listIdParam ? { listId: listIdParam, prefix: addDraft } : "skip"
  );

  const createList = useMutation(api.shoppingLists.createList);
  const updateListTitle = useMutation(api.shoppingLists.updateListTitle);
  const setListArchived = useMutation(api.shoppingLists.setListArchived);
  const removeList = useMutation(api.shoppingLists.removeList);
  const addItem = useMutation(api.shoppingLists.addItem);
  const updateItemText = useMutation(api.shoppingLists.updateItemText);
  const deleteItem = useMutation(api.shoppingLists.deleteItem);
  const toggleItemComplete = useMutation(api.shoppingLists.toggleItemComplete);

  const teamNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of memberships ?? []) {
      m.set(row.teamId, row.teamName);
    }
    return m;
  }, [memberships]);

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

  useEffect(() => {
    setEditingTitle(false);
    setEditingItemId(null);
    setAddDraft("");
  }, [listIdParam]);

  useEffect(() => {
    if (!editingItemId) return;
    editInputRef.current?.focus();
    editInputRef.current?.select();
  }, [editingItemId]);

  const listTitle = selectedList?.title ?? "";
  const [titleDraft, setTitleDraft] = useState(listTitle);
  useEffect(() => {
    if (editingTitle) return;
    setTitleDraft(listTitle);
  }, [listTitle, listIdParam, editingTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editingTitle]);

  async function handleSaveTitle() {
    if (!listIdParam) return;
    const t = titleDraft.trim();
    if (!t) {
      setTitleDraft(listTitle);
      return;
    }
    if (t === listTitle) return;
    try {
      await updateListTitle({ listId: listIdParam, title: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update title");
    }
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      const id = await createList({
        title,
        teamId: newScope === "personal" ? undefined : newScope,
      });
      setNewTitle("");
      setCreateOpen(false);
      setNewScope("personal");
      openList(id);
      toast.success("List created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create list");
    }
  }

  async function handleAddItem(text: string) {
    if (!listIdParam) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addItem({ listId: listIdParam, text: trimmed });
      setAddDraft("");
      requestAnimationFrame(() => {
        document.getElementById("shopping-list-add-item")?.focus();
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add item");
    }
  }

  async function addItemFromSuggestion(label: string) {
    await handleAddItem(label);
  }

  async function commitEditItem() {
    if (!editingItemId) return;
    const text = editText.trim();
    if (!text) {
      setEditingItemId(null);
      return;
    }
    try {
      await updateItemText({ itemId: editingItemId, text });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
    setEditingItemId(null);
  }

  const detailOpen = Boolean(listIdParam);
  const listDetailLoading = Boolean(listIdParam && selectedList === undefined);
  const listDetailMissing = Boolean(listIdParam && selectedList === null);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
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
            onOpenStats={() => navigate("/stats")}
            onOpenLists={() => navigate("/lists")}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your lists
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Quick shopping lists with suggestions and real-time sync for teams. Open a card to
              edit; everything saves automatically.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <Button
              type="button"
              size="lg"
              className="h-11 w-full gap-2 rounded-3xl px-6 shadow-sm sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-5 w-5" />
              New shopping list
            </Button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:justify-end">
              <Checkbox
                id="lists-show-archived"
                checked={showArchived}
                onCheckedChange={(v) => setShowArchived(v === true)}
              />
              Show archived lists
            </label>
          </div>
        </div>

        <div className="mt-10">
          {previews === undefined ? (
            <p className="text-center text-sm text-muted-foreground">Loading lists…</p>
          ) : previews.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-background/70 shadow-none">
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-muted ring-1 ring-border/60">
                  <ListChecks className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">No lists yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Create a list for groceries, errands, or shared team shopping. You can pick
                    personal or a team when you create it.
                  </p>
                </div>
                <Button type="button" size="lg" className="rounded-3xl px-8" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create your first list
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {(previews as PreviewRow[]).map(({ list, previewItems, totalItemCount }) => {
                const scope =
                  list.teamId === undefined
                    ? "Personal"
                    : (teamNameById.get(list.teamId) ?? "Team");
                const more = Math.max(0, totalItemCount - previewItems.length);
                return (
                  <button
                    key={list._id}
                    type="button"
                    onClick={() => openList(list._id)}
                    className={cn(
                      "group flex flex-col rounded-4xl border border-border/60 bg-background/90 p-5 text-left shadow-sm ring-1 ring-transparent transition-all",
                      "hover:border-primary/25 hover:bg-background hover:shadow-md hover:ring-primary/15",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight text-foreground group-hover:text-foreground">
                        {list.title}
                      </h2>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {list.isArchived ? (
                          <Badge variant="secondary" className="font-normal">
                            Archived
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          {scope}
                        </Badge>
                      </div>
                    </div>
                    <ul className="mt-4 min-h-26 space-y-1.5 text-sm" aria-label="Preview items">
                      {previewItems.length === 0 ? (
                        <li className="text-muted-foreground italic">No items yet — tap to add</li>
                      ) : (
                        previewItems.map((item, index) => (
                          <li
                            key={item._id}
                            className={cn(
                              "truncate text-muted-foreground",
                              item.completed && "line-through opacity-60",
                              previewLineClass(index)
                            )}
                          >
                            <span className="text-foreground/80">{item.text}</span>
                          </li>
                        ))
                      )}
                    </ul>
                    {more > 0 ? (
                      <p className="mt-3 text-xs font-medium text-muted-foreground">+{more} more</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeList();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,52rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {listDetailLoading ? (
            <>
              <div className="flex items-center justify-end border-b border-border/60 px-4 py-3 sm:px-5">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
              <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
                Loading…
              </div>
            </>
          ) : listDetailMissing || !listIdParam || !selectedList ? (
            <>
              <div className="flex items-center justify-end border-b border-border/60 px-4 py-3 sm:px-5">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
              <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-sm text-muted-foreground sm:px-6">
                <p>This list is unavailable.</p>
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="rounded-3xl">
                    Back to lists
                  </Button>
                </DialogClose>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  {editingTitle ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={() => {
                        void handleSaveTitle();
                        setEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === "Escape") {
                          setTitleDraft(listTitle);
                          setEditingTitle(false);
                        }
                      }}
                      className={cn(
                        "w-full min-w-0 bg-transparent pb-1 text-xl font-semibold tracking-tight outline-none sm:text-2xl",
                        "border-0 border-b-2 border-primary/50 placeholder:text-muted-foreground/60",
                        "focus-visible:border-primary focus-visible:ring-0"
                      )}
                      placeholder="List title"
                      aria-label="List title"
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "w-full max-w-full rounded-xl px-1 py-1 text-left text-xl font-semibold tracking-tight transition-colors outline-none sm:text-2xl",
                        "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
                        !listTitle.trim() && "text-muted-foreground"
                      )}
                      onClick={() => setEditingTitle(true)}
                      aria-label="Edit list title"
                    >
                      {listTitle.trim() ? listTitle : "Untitled list"}
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="List actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await setListArchived({
                              listId: listIdParam,
                              isArchived: !(selectedList.isArchived ?? false),
                            });
                            toast.success(
                              selectedList.isArchived ? "List restored" : "List archived"
                            );
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed");
                          }
                        }}
                      >
                        {selectedList.isArchived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteListOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete list
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Close">
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              <ScrollArea className="max-h-[calc(min(92vh,52rem)-8.5rem)] flex-1 px-5 pb-4 sm:px-6">
                <div className="space-y-4 pb-4 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="shopping-list-add-item" className="text-xs text-muted-foreground">
                      Add item
                    </Label>
                    <div className="px-1 pb-1">
                      <ShoppingItemCombobox
                        inputId="shopping-list-add-item"
                        disabled={!listIdParam}
                        inputValue={addDraft}
                        onInputValueChange={setAddDraft}
                        items={suggestions ?? []}
                        onPickSuggestion={addItemFromSuggestion}
                        onSubmitCustom={handleAddItem}
                        placeholder="Search suggestions or type a new item…"
                      />
                    </div>
                  </div>

                  <ul ref={attachItemsListAnimation} className="flex flex-col border-t border-border/50">
                    {items?.length === 0 ? (
                      <li className="border-b border-border/50 py-8 text-center text-sm text-muted-foreground">
                        No items yet.
                      </li>
                    ) : (
                      items?.map((item) => (
                        <li
                          key={item._id}
                          className={cn(
                            "group flex min-h-8 items-center gap-2 border-b border-border/50 py-1 pr-0.5 pl-0.5 transition-colors last:border-b-0",
                            "hover:bg-muted/40",
                            item.completed && "text-muted-foreground"
                          )}
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={async () => {
                              try {
                                await toggleItemComplete({ itemId: item._id });
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed");
                              }
                            }}
                            className="shrink-0"
                          />
                          {editingItemId === item._id ? (
                            <Input
                              ref={editInputRef}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onBlur={() => void commitEditItem()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void commitEditItem();
                                }
                                if (e.key === "Escape") {
                                  setEditingItemId(null);
                                }
                              }}
                              className="h-8 min-h-8 flex-1 rounded-lg border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
                            />
                          ) : (
                            <button
                              type="button"
                              className={cn(
                                "min-h-8 min-w-0 flex-1 truncate py-0.5 text-left text-sm leading-snug",
                                item.completed && "line-through opacity-60"
                              )}
                              onClick={() => {
                                setEditingItemId(item._id);
                                setEditText(item.text);
                              }}
                            >
                              {item.text}
                            </button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
                            aria-label="Remove item"
                            onClick={async () => {
                              try {
                                await deleteItem({ itemId: item._id });
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed");
                              }
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </ScrollArea>

              <div className="border-t border-border/60 bg-muted/20 px-5 py-3 sm:px-6">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" className="w-full rounded-3xl sm:w-auto">
                    Done
                  </Button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void handleCreateList(e)}>
            <DialogHeader>
              <DialogTitle>New shopping list</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="list-title">Title</Label>
                <Input
                  id="list-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Groceries"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Scope</Label>
                <Select
                  value={newScope === "personal" ? "personal" : newScope}
                  onValueChange={(v) =>
                    setNewScope(v === "personal" ? "personal" : (v as Id<"teams">))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    {(memberships ?? []).map((m) => (
                      <SelectItem key={m.teamId} value={m.teamId}>
                        {m.teamName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newTitle.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteListOpen} onOpenChange={setDeleteListOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>
              All items and suggestions for this list will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!listIdParam) return;
                try {
                  await removeList({ listId: listIdParam });
                  setDeleteListOpen(false);
                  closeList();
                  toast.success("List deleted");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
