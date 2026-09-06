import { z } from "zod";

// Shared between client-side forms (react-hook-form + zodResolver) and the
// server actions that ultimately enforce them — one source of truth so a
// relaxed client check can never be the only line of defense.

export const emailSchema = z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse");

export const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen")
  .max(200, "Maximal 200 Zeichen");

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Vorname erforderlich").max(100),
    lastName: z.string().trim().min(1, "Nachname erforderlich").max(100),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    birthYear: z.coerce
      .number()
      .int()
      .min(1920, "Ungültiges Geburtsjahr")
      .max(new Date().getFullYear(), "Ungültiges Geburtsjahr"),
    gender: z.enum(["m", "w"], { message: "Bitte auswählen" }),
    club: z.string().trim().max(150).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Passwort erforderlich"),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

export const ITN_MIN = 1.0;
export const ITN_MAX = 10.3;

export const selfItnSchema = z.object({
  value: z.coerce
    .number()
    .min(ITN_MIN, `Muss zwischen ${ITN_MIN} und ${ITN_MAX} liegen`)
    .max(ITN_MAX, `Muss zwischen ${ITN_MIN} und ${ITN_MAX} liegen`)
    .multipleOf(0.1, "Nur eine Nachkommastelle"),
});

export const profileSchema = z.object({
  club: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  preferredTimes: z.string().trim().max(500).optional().or(z.literal("")),
  showItnPublicly: z.boolean(),
});
