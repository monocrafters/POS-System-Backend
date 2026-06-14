import { z } from "zod";
export const shopSettingsSchema = z.object({
    shopName: z.string().trim().min(1, "Store name is required").max(80),
    shopTagline: z.string().trim().max(120).optional().nullable(),
    receiptPhone: z
        .string()
        .trim()
        .max(40)
        .optional()
        .nullable()
        .transform((v) => v || null),
    returnsEnabled: z.boolean().optional(),
    returnRefundPercent: z.coerce.number().min(0).max(100).optional(),
});

