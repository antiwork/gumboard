"use client"

import { useState, useEffect } from "react"

const DARK_MODE_COLOR_MAP: Record<string, string> = {
  "#fef3c7": "#451a03", // yellow -> dark yellow
  "#fce7f3": "#4c1d95", // pink -> dark pink  
  "#dbeafe": "#1e3a8a", // blue -> dark blue
  "#dcfce7": "#14532d", // green -> dark green
  "#fed7d7": "#7f1d1d", // red -> dark red
  "#e0e7ff": "#312e81", // indigo -> dark indigo
  "#f3e8ff": "#581c87", // purple -> dark purple
  "#fef4e6": "#9a3412", // orange -> dark orange
}

export function getNoteColor(color: string, isDark: boolean): string {
  if (!isDark) {
    return color
  }
  
  return DARK_MODE_COLOR_MAP[color] || color
}

export function getNoteColorClass(color: string): string {
  const colorClassMap: Record<string, string> = {
    "#fef3c7": "bg-yellow-200/70 dark:bg-yellow-900/70",
    "#fce7f3": "bg-pink-200/70 dark:bg-pink-900/70",
    "#dbeafe": "bg-blue-200/70 dark:bg-blue-900/70", 
    "#dcfce7": "bg-green-200/70 dark:bg-green-900/70",
    "#fed7d7": "bg-red-200/70 dark:bg-red-900/70",
    "#e0e7ff": "bg-indigo-200/70 dark:bg-indigo-900/70",
    "#f3e8ff": "bg-purple-200/70 dark:bg-purple-900/70",
    "#fef4e6": "bg-orange-200/70 dark:bg-orange-900/70",
  }
  
  return colorClassMap[color] || "bg-gray-200/70 dark:bg-gray-900/70"
}

export function useNoteColors() {
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setIsDark(mediaQuery.matches)
    
    setIsDark(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return { isDark, getNoteColor: (color: string) => getNoteColor(color, isDark) }
}
