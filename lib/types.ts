export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

export interface Note {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  board?: {
    id: string;
    name: string;
  };
}

export interface User {
  id: string;
  name: string | null;
  email: string;
}