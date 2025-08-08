# Gumboard Component Architecture

## Overview
This document describes the modular component architecture implemented for issue #128, where each component manages its own state and communicates with the backend independently.

## Component Hierarchy & Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BoardPage Component                              │
│  /app/boards/[id]/page.tsx                                              │
├─────────────────────────────────────────────────────────────────────────┤
│ State Management:                                                        │
│  • board, allBoards - Board data                                       │
│  • notes - Array of notes for layout positioning                       │
│  • user - Current user info                                            │
│  • UI states (dropdowns, modals)                                       │
│  • Filters (search, date, author)                                      │
│                                                                         │
│ API Calls:                                                              │
│  • GET /api/user - Fetch user info                                     │
│  • GET /api/boards - Fetch all boards                                  │
│  • GET /api/boards/{id} - Fetch specific board                         │
│  • GET /api/boards/{id}/notes - Initial notes fetch                    │
│  • POST /api/boards - Create new board                                 │
│  • POST /api/boards/{id}/notes - Create new note                       │
│  • PUT /api/boards/{id} - Update board settings                        │
│                                                                         │
│ Responsibilities:                                                       │
│  • Authentication check & redirect                                      │
│  • Board selection and navigation                                      │
│  • Note filtering and search                                           │
│  • Layout calculation (masonry grid)                                   │
│  • Creating new notes (empty shell)                                    │
│  • Managing board-level settings                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Renders multiple
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       NoteContainer Component                            │
│  /components/note-container.tsx                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Props:                                                                  │
│  • noteId: string                                                       │
│  • boardId: string                                                      │
│  • initialData?: NoteData (for faster initial render)                  │
│  • currentUserId?: string                                               │
│  • isAdmin?: boolean                                                    │
│  • showBoardName?: boolean                                              │
│  • onDelete?: () => void (callback to parent)                          │
│  • className?: string                                                   │
│  • style?: React.CSSProperties (positioning)                           │
│                                                                         │
│ Internal State:                                                         │
│  • note: NoteData | null - Complete note data                          │
│  • isEditing: boolean - Note content editing mode                      │
│  • editContent: string - Temporary edit buffer                         │
│  • deleteDialogOpen: boolean - Delete confirmation                     │
│  • loading: boolean - Data fetch status                                │
│                                                                         │
│ API Calls:                                                              │
│  • GET /api/boards/{boardId}/notes/{noteId} - Fetch note data          │
│  • PUT /api/boards/{boardId}/notes/{noteId} - Update note content      │
│  • PUT /api/boards/{boardId}/notes/{noteId} - Toggle all items         │
│  • DELETE /api/boards/{boardId}/notes/{noteId} - Delete note           │
│                                                                         │
│ Features:                                                               │
│  • Self-contained data fetching                                         │
│  • Optimistic updates with rollback                                    │
│  • Own delete confirmation dialog                                      │
│  • Toggle all checklist items                                          │
│  • Loading state while fetching                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Contains
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ChecklistContainer Component                          │
│  /components/checklist-container.tsx                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Props:                                                                  │
│  • noteId: string                                                       │
│  • boardId: string                                                      │
│  • items: ChecklistItemData[]                                          │
│  • canEdit: boolean                                                     │
│  • onItemsUpdate: (items, done) => void                                │
│  • onContentEdit?: () => void                                          │
│                                                                         │
│ Internal State:                                                         │
│  • editingItemId: string | null - Currently editing item               │
│  • isAddingItem: boolean - Adding new item mode                        │
│  • newItemContent: string - New item input buffer                      │
│  • animatingItems: Set<string> - Items being animated                  │
│  • editDebounceMap: Map<string, Timeout> - Edit debouncing             │
│                                                                         │
│ API Calls (all to same endpoint with different payloads):              │
│  • PUT /api/boards/{boardId}/notes/{noteId}                            │
│    - Add new checklist item                                             │
│    - Toggle item checked state                                          │
│    - Delete checklist item                                              │
│    - Edit item content (debounced)                                     │
│    - Split checklist item                                               │
│                                                                         │
│ Features:                                                               │
│  • Complete checklist CRUD operations                                  │
│  • Optimistic updates for all operations                               │
│  • Debounced editing (1000ms)                                          │
│  • Animation states for transitions                                     │
│  • Smart reordering (unchecked first)                                  │
│  • Enter key handling for quick adds                                   │
│  • Escape key to cancel operations                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Renders multiple
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ChecklistItem Component                             │
│  /components/checklist-item.tsx                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ Props:                                                                  │
│  • content: string                                                      │
│  • checked: boolean                                                     │
│  • isEditing: boolean                                                   │
│  • canEdit: boolean                                                     │
│  • isAnimating: boolean                                                 │
│  • onToggle: () => void                                                │
│  • onDelete: () => void                                                │
│  • onEdit: (content) => void                                           │
│  • onEditStart: () => void                                             │
│  • onEditEnd: () => void                                                │
│  • onSplit: (content, position) => void                                │
│                                                                         │
│ Internal State:                                                         │
│  • editContent: string - Local edit buffer                             │
│  • cursorPosition: number - For split operation                        │
│                                                                         │
│ Responsibilities:                                                       │
│  • Pure presentation component                                          │
│  • No API calls or external state                                      │
│  • Checkbox rendering and interaction                                  │
│  • Edit mode UI with input field                                       │
│  • Delete button on hover                                              │
│  • Keyboard shortcuts (Enter, Escape, etc.)                            │
│  • Content change detection                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Page Load
```
BoardPage
    ├── GET /api/user → setUser()
    ├── GET /api/boards → setAllBoards()
    ├── GET /api/boards/{id} → setBoard()
    └── GET /api/boards/{id}/notes → setNotes()
              │
              ▼
    Renders NoteContainer for each note with initialData
              │
              ▼
    NoteContainer (if no initialData)
         └── GET /api/boards/{boardId}/notes/{noteId} → setNote()
```

### 2. Creating a New Note
```
User clicks "Add Note" → BoardPage
    └── POST /api/boards/{id}/notes → 
         └── Adds new note to notes array
              └── Renders new NoteContainer
                   └── NoteContainer shows empty state with "Add task" button
```

### 3. Adding a Checklist Item
```
User clicks "Add task" → ChecklistContainer
    ├── Sets isAddingItem = true
    ├── Shows input field
    └── User types and presses Enter
         └── PUT /api/boards/{boardId}/notes/{noteId}
              └── Optimistic update
              └── Server response updates final state
```

### 4. Editing Note Content
```
User clicks on note → NoteContainer
    ├── Sets isEditing = true
    ├── Shows textarea
    └── User types and blurs/saves
         └── PUT /api/boards/{boardId}/notes/{noteId}
              └── Updates note content
```

### 5. Deleting a Note
```
User clicks delete → NoteContainer
    ├── Shows delete confirmation dialog
    └── User confirms
         └── DELETE /api/boards/{boardId}/notes/{noteId}
              └── Calls onDelete callback
                   └── BoardPage removes note from array
```

## State Management Strategy

### Parent Component (BoardPage)
- **Manages**: Board-level data, user authentication, layout calculations
- **Does NOT manage**: Individual note states, checklist states, editing modes

### Container Components (NoteContainer, ChecklistContainer)
- **Fully autonomous**: Fetch their own data, manage their own state
- **Optimistic updates**: Update UI immediately, rollback on error
- **Error handling**: Each component handles its own errors

### Pure Components (ChecklistItem)
- **Stateless**: Only local UI state (edit buffer)
- **Reusable**: Can be tested in isolation
- **Performance**: Minimal re-renders

## API Communication Pattern

```
┌─────────────────────────────────────────┐
│           BoardPage                      │
│  ┌─────────────────────────────────┐    │
│  │ Initial Load:                   │    │
│  │ • /api/user                     │    │
│  │ • /api/boards                   │    │
│  │ • /api/boards/{id}/notes        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                    
┌─────────────────────────────────────────┐
│          NoteContainer                   │
│  ┌─────────────────────────────────┐    │
│  │ Independent Operations:         │    │
│  │ • GET /api/boards/{b}/notes/{n} │    │
│  │ • PUT /api/boards/{b}/notes/{n} │    │
│  │ • DELETE /api/boards/{b}/notes/{n}│  │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│       ChecklistContainer                 │
│  ┌─────────────────────────────────┐    │
│  │ All Checklist Operations:       │    │
│  │ • PUT /api/boards/{b}/notes/{n} │    │
│  │   - Add item                    │    │
│  │   - Toggle item                 │    │
│  │   - Delete item                 │    │
│  │   - Edit item                   │    │
│  │   - Split item                  │    │
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each component has a single, well-defined responsibility
2. **Independent Testing**: Components can be tested in isolation
3. **Optimistic Updates**: Better UX with immediate feedback
4. **Scalability**: Easy to add new features to specific components
5. **Reusability**: Components can be reused in different contexts
6. **Performance**: Minimal prop drilling and targeted re-renders

## Component File Structure

```
/app/boards/[id]/page.tsx          # BoardPage - Main page component
/components/
  ├── note-container.tsx           # NoteContainer - Self-contained note component with own state & API
  ├── checklist-container.tsx      # ChecklistContainer - Independent checklist with full CRUD operations
  └── checklist-item.tsx           # ChecklistItem - Pure UI component for individual items
```

## Implementation Summary

This architecture implements a truly modular component system where:

- **NoteContainer** is a self-contained component that:
  - Fetches its own data from the API
  - Manages all note-related state internally
  - Handles note updates and deletion independently
  
- **ChecklistContainer** is a fully autonomous component that:
  - Manages all checklist CRUD operations
  - Makes its own API calls for every operation
  - Handles its own UI state (editing, adding items)
  
- **ChecklistItem** remains a pure presentation component for maximum reusability

Each component "chats with the back-end separately" as requested, with no shared state management between parent and child components.