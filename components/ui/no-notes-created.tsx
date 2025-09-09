import { Button } from "@/components/ui/button";
import { Plus, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoNotesCreatedProps {
  onCreateNote?: () => void;
  boardName?: string;
  className?: string;
  isArchive?: boolean;
}

export function NoNotesCreated({
  onCreateNote,
  boardName,
  className,
  isArchive = false,
}: NoNotesCreatedProps) {
  const title = isArchive ? "No archived notes" : "No notes yet";
  const description = isArchive
    ? "Notes that you archive will appear here. Archived notes are hidden from your active boards but can be restored anytime."
    : boardName
      ? `Start organizing your ideas by creating your first note in ${boardName}.`
      : "Start organizing your ideas by creating your first note.";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
        className
      )}
    >
      <div className="mb-4">
        <StickyNote className="w-12 h-12 text-muted-foreground dark:text-zinc-400 mx-auto" />
      </div>

      <h3 className="text-xl font-semibold text-foreground dark:text-zinc-100 mb-2">{title}</h3>

      <p className="text-muted-foreground dark:text-zinc-400 mb-6 max-w-md">{description}</p>

      {!isArchive && onCreateNote && (
        <Button onClick={onCreateNote} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create your first note
        </Button>
      )}
    </div>
  );
}
