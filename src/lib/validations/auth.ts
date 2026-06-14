import { z } from "zod";
const lowercaseUsername = z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .transform((v) => v.toLowerCase().trim())
    .refine((v) => /^[a-z0-9_]+$/.test(v), {
    message: "Username must be lowercase letters, numbers, or underscore only",
});
export const registerSchema = z.object({
    username: lowercaseUsername,
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().min(2, "Full name is required").max(64),
    role: z.enum(["ADMIN", "CASHIER"]),
});
export const loginSchema = z.object({
    username: z
        .string()
        .min(1, "Username is required")
        .transform((v) => v.toLowerCase().trim()),
    password: z.string().min(1, "Password is required"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

