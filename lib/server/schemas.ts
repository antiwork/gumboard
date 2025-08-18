import { z } from "zod";

export const CreateItem = z.object({
  content: z.string().trim().min(1, "Content is required"),
  checked: z.boolean().optional().default(false),
});

export const UpdateItem = z
  .object({
    content: z.string().trim().optional(),
    checked: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const ReorderItems = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    })
  ),
});
