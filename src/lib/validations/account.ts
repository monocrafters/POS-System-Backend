import { z } from "zod";
const lowercaseUsername = z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .transform((v) => v.toLowerCase().trim())
    .refine((v) => /^[a-z0-9_]+$/.test(v), {
    message: "Username must be lowercase letters, numbers, or underscore only",
});
export const adminAccountSchema = z
    .object({
    currentPassword: z.string().min(1, "Current password is required"),
    username: lowercaseUsername,
    newPassword: z
        .string()
        .min(6, "New password must be at least 6 characters")
        .optional()
        .or(z.literal("")),
    confirmPassword: z.string().optional(),
})
    .refine((data) => {
    if (!data.newPassword)
        return true;
    return data.newPassword === data.confirmPassword;
}, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
});
export type AdminAccountInput = z.infer<typeof adminAccountSchema>;

