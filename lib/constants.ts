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

const BORDER = [
  "border-yellow-400",
  "border-pink-300",
  "border-blue-300",
  "border-green-300",
  "border-red-300",
  "border-indigo-300",
  "border-purple-300",
  "border-orange-300",
] as const;

const NEUTRAL_BORDER = {
  "#ffffff": "border-gray-300",
  "#f8fafc": "border-slate-300",
} as const;

const NOTE_BORDER_BASE = Object.fromEntries(NOTE_COLORS.map((c, i) => [c, BORDER[i]])) as Record<
  NoteColor,
  (typeof BORDER)[number]
>;

export const NOTE_BORDER_BY_HEX = {
  ...NOTE_BORDER_BASE,
  ...NEUTRAL_BORDER,
} as const;

type AnyHex = keyof typeof NOTE_BORDER_BY_HEX;

export const getNoteColors = (color: string, isDark: boolean) =>
  isDark
    ? "border-zinc-600"
    : (NOTE_BORDER_BY_HEX[(color?.toLowerCase?.() ?? "") as AnyHex] ?? "border-gray-300");
