"use client"

import type { ChecklistItemModel, NoteModel, NoteUpdate } from "@/lib/types/note"

export type ApiNote = {
  id: string
  content: string
  color: string
  done: boolean
  checklistItems?: ChecklistItemModel[] | null
  user: { id: string; name: string | null; email: string }
  board?: { id: string; name: string }
}

function mapApiNoteToModel(n: ApiNote): NoteModel {
  return {
    id: n.id,
    author: {
      id: n.user.id,
      name: n.user.name || n.user.email,
      email: n.user.email,
      initial: (n.user.name || n.user.email)[0]?.toUpperCase(),
    },
    color: n.color,
    checklistItems: (n.checklistItems ?? []).map((it, idx) => ({
      id: it.id,
      content: it.content,
      checked: it.checked,
      order: it.order ?? idx + 1,
    })),
    done: n.done,
  }
}

export async function fetchBoardNotes(boardId: string): Promise<NoteModel[]> {
  const res = await fetch(`/api/boards/${boardId}/notes`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch notes")
  const data = await res.json()
  const notes: ApiNote[] = data.notes
  return notes.map(mapApiNoteToModel)
}

export async function fetchAllOrgNotes(): Promise<NoteModel[]> {
  const res = await fetch(`/api/boards/all-notes/notes`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch notes")
  const data = await res.json()
  const notes: ApiNote[] = data.notes
  return notes.map(mapApiNoteToModel)
}

export async function createNote(boardId: string, checklistItems: ChecklistItemModel[] = []): Promise<NoteModel> {
  const body = { content: "", checklistItems }
  const res = await fetch(`/api/boards/${boardId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Failed to create note")
  const { note } = await res.json()
  return mapApiNoteToModel(note)
}

export async function updateNote(boardId: string, noteId: string, update: NoteUpdate & { content?: string }): Promise<NoteModel> {
  const res = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  })
  if (!res.ok) throw new Error("Failed to update note")
  const { note } = await res.json()
  return mapApiNoteToModel(note)
}

export async function deleteNote(boardId: string, noteId: string): Promise<void> {
  const res = await fetch(`/api/boards/${boardId}/notes/${noteId}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete note")
}


