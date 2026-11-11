import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .max(254, "Email is too long")
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password").max(200, "Password is too long"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
