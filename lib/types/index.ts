import { z } from "zod";
import { NOTE_COLORS } from "@/lib/constants";

const checklistItemSchema = z.object({
  id: z.string(),
  content: z.string(),
  checked: z.boolean(),
  order: z.number(),
});

export const noteSchema = z.object({
  boardId: z.string(),
  color: z.enum(NOTE_COLORS).optional(),
  archivedAt: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : val)),
  checklistItems: z.array(checklistItemSchema).optional(),
});

export const boardSchema = z.object({
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
  sendSlackUpdates: z.boolean().optional(),
});

export const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  slackWebhookUrl: z.string().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
});

export const inviteSchema = z.object({
  email: z
    .string()
    .email()
    .transform((email) => email.trim().toLowerCase()),
});

export const memberSchema = z.object({
  isAdmin: z.boolean().default(false),
});
