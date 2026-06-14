import { z } from "zod";
export const productSchema = z.object({
    name: z.string().min(1, "Product name is required").max(120),
    price: z.coerce.number().positive("Sale price must be greater than 0"),
    purchaseCost: z.coerce.number().min(0, "Purchase cost cannot be negative").optional().default(0),
    stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
    barcodes: z
        .array(z
        .string()
        .min(1)
        .transform((v) => v.trim()))
        .min(1, "At least one barcode is required"),
});
export const addBarcodeSchema = z.object({
    barcode: z.string().min(1).transform((v) => v.trim()),
});
export type ProductInput = z.infer<typeof productSchema>;

