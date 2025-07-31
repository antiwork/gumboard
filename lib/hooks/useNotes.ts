import useSWR from 'swr'
import { useEffect, useState } from 'react'

interface ChecklistItem {
  id: string
  content: string
  checked: boolean
  order: number
}

interface Note {
  id: string
  content: string
  color: string
  done: boolean
  createdAt: string
  updatedAt: string
  isChecklist?: boolean
  checklistItems?: ChecklistItem[]
  user: {
    id: string
    name: string | null
    email: string
  }
  board?: {
    id: string
    name: string
  }
}

interface NotesResponse {
  notes: Note[]
}

// Improved fetcher with error handling
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed to fetch notes')
    // Attach extra info to the error
    Object.assign(error, { info: await res.text(), status: res.status })
    throw error
  }
  return res.json()
}

export default function useNotes(boardId?: string | null) {
  const [isVisible, setIsVisible] = useState(true)
  
  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
  
  const refreshInterval = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 2000
  const url = !boardId
    ? null
    : boardId === 'all-notes'
      ? '/api/boards/all-notes/notes'
      : `/api/boards/${boardId}/notes`
      
  const { data, error, isLoading, mutate } = useSWR<NotesResponse>(
    url, 
    fetcher, 
    { 
      refreshInterval: isVisible ? refreshInterval : 0, // Only poll when tab is visible
      revalidateOnFocus: true,
      focusThrottleInterval: 10000, // Throttle focus revalidation to every 10s
      dedupingInterval: 2000, // Dedupe requests within 2s
    }
  )

  return { 
    notes: data?.notes ?? [], 
    error,
    isLoading, 
    mutate 
  }
}
