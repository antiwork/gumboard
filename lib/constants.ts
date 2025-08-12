export const NOTE_COLORS = [
  "#fef3c7", // yellow
  "#fce7f3", // pink
  "#dbeafe", // blue
  "#dcfce7", // green
  "#fed7d7", // red
  "#e0e7ff", // indigo
  "#f3e8ff", // purple
  "#fef4e6", // orange
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];
