import { useEffect, useCallback } from "react"

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        if (event.key !== "Escape") {
          return
        }
      }

      shortcuts.forEach((shortcut) => {
        const ctrlKey = shortcut.ctrl ?? false
        const metaKey = shortcut.meta ?? false
        const shiftKey = shortcut.shift ?? false
        const altKey = shortcut.alt ?? false

        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          return
        }

        const ctrlOrMetaMatch =
          (ctrlKey && (event.ctrlKey || event.metaKey)) ||
          (metaKey && (event.metaKey || event.ctrlKey)) ||
          (!ctrlKey && !metaKey && !event.ctrlKey && !event.metaKey)

        const shiftMatch = shiftKey === event.shiftKey
        const altMatch = altKey === event.altKey

        if (ctrlOrMetaMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.action()
        }
      })
    },
    [shortcuts],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}