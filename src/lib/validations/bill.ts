import { z } from "zod";
export const createBillSchema = z.object({
    items: z
        .array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().positive().optional(),
        name: z.string().min(1).optional(),
        lineDiscount: z.coerce.number().min(0).optional().default(0),
    }))
        .min(1, "Cart is empty"),
    discountAmount: z.coerce.number().min(0).optional().default(0),
});
export type CreateBillInput = z.infer<typeof createBillSchema>;

