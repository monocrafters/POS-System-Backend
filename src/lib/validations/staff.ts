import { z } from "zod";
const lowercaseUsername = z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .transform((v) => v.toLowerCase().trim())
    .refine((v) => /^[a-z0-9_]+$/.test(v), {
    message: "Username must be lowercase letters, numbers, or underscore only",
});
export const cashierRegisterSchema = z.object({
    username: lowercaseUsername,
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().min(2, "Full name is required").max(64),
});
export const cashierUpdateSchema = z.object({
    username: lowercaseUsername.optional(),
    fullName: z.string().min(2).max(64).optional(),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .optional()
        .or(z.literal("")),
});
export type CashierRegisterInput = z.infer<typeof cashierRegisterSchema>;
export type CashierUpdateInput = z.infer<typeof cashierUpdateSchema>;

