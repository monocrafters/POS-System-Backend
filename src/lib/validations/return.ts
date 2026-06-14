import { z } from "zod";
export const createReturnSchema = z.object({
    billId: z.string().min(1),
    items: z
        .array(z.object({
        billItemId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
    }))
        .min(1, "Select at least one item to return"),
});
export const returnSettingsSchema = z.object({
    returnsEnabled: z.boolean().optional(),
    returnRefundPercent: z.coerce.number().min(0).max(100).optional(),
});

