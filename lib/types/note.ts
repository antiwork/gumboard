export type ChecklistItemModel = {
  id: string
  content: string
  checked: boolean
  order: number
}

export type NoteAuthor = {
  id?: string
  name: string
  email?: string
  initial?: string
}

export type NoteModel = {
  id: string
  author: NoteAuthor
  color: string
  checklistItems: ChecklistItemModel[]
  done?: boolean
}

export type NoteUpdate = Partial<Pick<NoteModel, "color" | "done">> & {
  checklistItems?: ChecklistItemModel[]
}


