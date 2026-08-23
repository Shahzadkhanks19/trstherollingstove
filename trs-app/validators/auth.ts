import { z } from "zod";

export const strongPassword = z
  .string()
  .min(10, "Password must contain at least 10 characters.")
  .max(128, "Password must not exceed 128 characters.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/\d/, "Password must contain a number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain a special character.",
  );

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^[6-9]\d{9}$/,
    "Enter a valid 10-digit Indian mobile number.",
  );

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(80, "Name must not exceed 80 characters."),

  email: z
    .email("Enter a valid email address.")
    .transform((value) => value.trim().toLowerCase()),

  phone: phoneSchema.optional(),

  password: strongPassword,

  marketingWhatsAppOptIn: z.boolean().default(false),

  marketingEmailOptIn: z.boolean().default(false),

  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9]{6,20}$/,
      "Referral code is invalid.",
    )
    .optional(),
});

/**
 * Web customer/admin login schema.
 *
 * Expected body:
 * {
 *   identifier: string;
 *   password: string;
 *   rememberMe?: boolean;
 * }
 */
export const loginSchema = z.object({
  identifier: z
    .string({
      error: "Email address or phone number is required.",
    })
    .trim()
    .min(
      5,
      "Enter your registered email address or phone number.",
    ),

  password: z
    .string({
      error: "Password is required.",
    })
    .min(1, "Password is required."),

  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required."),

    newPassword: strongPassword,

    confirmPassword: z
      .string()
      .min(1, "Confirm your new password."),
  })
  .superRefine((input, context) => {
    if (input.currentPassword === input.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from the current password.",
      });
    }

    if (input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "The password confirmation does not match.",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z
    .email("Enter a valid email address.")
    .transform((value) => value.trim().toLowerCase()),
});

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32, "Reset token is invalid."),

    newPassword: strongPassword.optional(),

    password: strongPassword.optional(),

    confirmPassword: z.string().optional(),
  })
  .superRefine((input, context) => {
    const resolvedPassword =
      input.newPassword ?? input.password;

    if (!resolvedPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password is required.",
      });

      return;
    }

    if (
      input.confirmPassword !== undefined &&
      resolvedPassword !== input.confirmPassword
    ) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "The password confirmation does not match.",
      });
    }
  })
  .transform((input) => ({
    token: input.token,
    newPassword:
      input.newPassword ?? input.password!,
  }));

export const verifyEmailSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Verification token is invalid."),
});

export const resendVerificationSchema = z.object({
  email: z
    .email("Enter a valid email address.")
    .transform((value) => value.trim().toLowerCase()),
});

export const changeEmailSchema = z.object({
  newEmail: z
    .email("Enter a valid email address.")
    .transform((value) => value.trim().toLowerCase()),

  currentPassword: z
    .string()
    .min(1, "Current password is required."),
});
