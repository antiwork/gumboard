import { getResponsiveConfig } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { Note, Note as NoteCard, User } from "@/components/note";

export function SortableNoteWrapper({
  note,
  user,
  resolvedTheme,
  boardId,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
}: {
  note: Note;
  user: User;
  resolvedTheme: string | undefined;
  boardId: string | null;
  onUpdate: (updatedNote: Note) => void;
  onDelete: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onUnarchive?: (noteId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  });

  const style = {
    position: "absolute" as const,
    left: note.x,
    top: note.y,
    width: note.width,
    height: note.height,
    padding: `0 px`,
    backgroundColor: resolvedTheme === "dark" ? "#18181B" : note.color,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded-md">
      <NoteCard
        style={{
          padding: `${getResponsiveConfig().notePadding}px`,
          width: note.width,
          height: note.height,
        }}
        note={note as Note}
        currentUser={user}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onArchive={boardId !== "archive" ? onArchive : undefined}
        onUnarchive={boardId === "archive" ? onUnarchive : undefined}
        showBoardName={boardId === "all-notes" || boardId === "archive"}
      />
    </div>
  );
}
