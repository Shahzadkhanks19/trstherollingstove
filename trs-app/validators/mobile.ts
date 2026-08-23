import { z } from "zod";

const mobilePlatformSchema = z.enum([
  "ios",
  "android",
]);

const installationIdSchema = z
  .string()
  .trim()
  .min(1, "Installation ID is required.")
  .max(
    255,
    "Installation ID must not exceed 255 characters.",
  );

const optionalDeviceTextSchema = z
  .string()
  .trim()
  .max(255)
  .optional();

export const mobileLoginSchema = z.object({
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

  installationId: installationIdSchema,

  platform: mobilePlatformSchema,

  pushToken: optionalDeviceTextSchema,

  deviceName: optionalDeviceTextSchema,

  appVersion: optionalDeviceTextSchema,

  osVersion: optionalDeviceTextSchema,

  locale: optionalDeviceTextSchema,

  timezone: optionalDeviceTextSchema,
});

export const mobileLogoutSchema = z.object({
  installationId: installationIdSchema,
});

export const mobileRefreshSchema = z.object({
  refreshToken: z
    .string()
    .trim()
    .min(1, "Refresh token is required."),
});

export const mobileDeviceSchema = z.object({
  installationId: installationIdSchema,

  platform: mobilePlatformSchema,

  pushToken: optionalDeviceTextSchema,

  deviceName: optionalDeviceTextSchema,

  appVersion: optionalDeviceTextSchema,

  osVersion: optionalDeviceTextSchema,

  locale: optionalDeviceTextSchema,

  timezone: optionalDeviceTextSchema,
});