import { z } from "zod";

export const checklistItemSchema = z.object({
    id: z.string(),
    content: z.string(),
    checked: z.boolean(),
    order: z.number(),
});

export const checklistItemInputSchema = z.object({
    content: z.string().optional().default(""),
    checked: z.boolean().optional().default(false),
    order: z.number().optional(),
})

export const createNoteSchema = z.object({
    color: z.string().optional(),
    checklistItems: z.array(checklistItemInputSchema).optional(),
});

export const updateNoteSchema = z.object({
    color: z.string().optional(),
    archivedAt: z
        .string()
        .nullable()
        .optional()
        .transform((val) => (val ? new Date(val) : val)),
    checklistItems: z.array(checklistItemSchema).optional(),
});

export const createGlobalNoteSchema = z.object({
    boardId: z.string(),
    color: z.string().optional(),
    checklistItems: z.array(checklistItemInputSchema).optional(),
});

export const updateBoardSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
    sendSlackUpdates: z.boolean().optional(),
});

export const createBoardSchema = z.object({
    name: z
        .string()
        .min(1, "Board name is required and cannot be empty or only whitespace")
        .refine(
            (val) => val.trim().length > 0,
            "Board name is required and cannot be empty or only whitespace"
        ),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
});

export const updateMemberSchema = z.object({
    isAdmin: z.boolean().default(false),
});

export const updateOrganizationSchema = z.object({
    name: z.string().min(1, "Organization name is required"),
    slackWebhookUrl: z.string().optional(),
});

export const updateProfileSchema = z.object({
    name: z.string().min(1, "Name is required").trim(),
});

export const inviteSchema = z.object({
    email: z
        .string()
        .email()
        .transform((email) => email.trim().toLowerCase()),
});
