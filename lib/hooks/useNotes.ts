import useSWR from 'swr'

interface NotesResponse {
  notes: any[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function useNotes(boardId?: string | null) {
  const refreshInterval = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 5000
  const url = !boardId
    ? null
    : boardId === 'all-notes'
      ? '/api/boards/all-notes/notes'
      : `/api/boards/${boardId}/notes`
  const { data, isLoading, mutate } = useSWR<NotesResponse>(url, fetcher, { refreshInterval })

  return { notes: data?.notes ?? [], isLoading, mutate }
}
