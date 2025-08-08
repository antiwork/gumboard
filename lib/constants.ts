export const NOTE_COLORS = [
  "#fef3c7", // yellow
  "#fce7f3", // pink
  "#dbeafe", // blue
  "#dcfce7", // green
  "#fed7d7", // red
  "#e0e7ff", // indigo
  "#f3e8ff", // purple
  "#fef4e6", // orange
] as const

export type NoteColor = typeof NOTE_COLORS[number]

export const colorConfig: Record<string, { light: string; dark: string }> = {
  "#fef3c7": { light: "bg-[#fef3c7]", dark: "bg-yellow-100/20" },
  "#fce7f3": { light: "bg-[#fce7f3]", dark: "bg-pink-100/20" },
  "#dbeafe": { light: "bg-[#dbeafe]", dark: "bg-blue-100/20" },
  "#dcfce7": { light: "bg-[#dcfce7]", dark: "bg-green-100/20" },
  "#fed7d7": { light: "bg-[#fed7d7]", dark: "bg-red-100/20" },
  "#e0e7ff": { light: "bg-[#e0e7ff]", dark: "bg-indigo-100/20" },
  "#f3e8ff": { light: "bg-[#f3e8ff]", dark: "bg-purple-100/20" },
  "#fef4e6": { light: "bg-[#fef4e6]", dark: "bg-orange-100/20" },
};