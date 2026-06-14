import { z } from "zod";
export const receiptSettingsSchema = z.object({
    receiptPhone: z
        .string()
        .trim()
        .max(30, "Phone number is too long")
        .optional()
        .nullable()
        .transform((v) => (v === "" ? null : v ?? null)),
});

