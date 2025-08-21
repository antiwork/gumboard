export const NOTE_COLORS = [
  "#fff2a8", // butter yellow
  "#ffe17a", // sun yellow
  "#ffb77a", // apricot
  "#d9f1b1", // pale green
  "#bfe48d", // spring green
  "#87e6d6", // mint teal
  "#cde4ff", // baby blue
  "#a8c8ff", // periwinkle
  "#c7b7ff", // soft lavender
  "#f7c2e6", // soft pink
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export const SLACK_WEBHOOK_REGEX = /slack/i;
