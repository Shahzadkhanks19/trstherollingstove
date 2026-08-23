import { Types, type HydratedDocument } from "mongoose";

import { authConfig } from "@/config/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/AppError";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/auth/randomToken";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import {
  generateUniqueReferralCode,
  normalizeReferralCode,
} from "@/lib/referrals/referralCode";
import { AuthSession } from "@/models/AuthSession";
import { CustomerProfile, type CustomerProfileDocument } from "@/models/CustomerProfile";
import { Referral } from "@/models/Referral";
import { Role } from "@/models/Role";
import { SecurityToken } from "@/models/SecurityToken";
import { User } from "@/models/User";
import { sendTransactionalEmail } from "@/services/email.service";

type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  marketingWhatsAppOptIn: boolean;
  marketingEmailOptIn: boolean;
  referralCode?: string;
};

export async function createCustomer(input: CreateCustomerInput) {
  await connectToDatabase();

  if (
    await User.exists({
      $or: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])],
    })
  ) {
    throw new AppError("Account already exists.", 409);
  }

  const role = await Role.findOne({ key: "customer", isActive: true });
  if (!role) {
    throw new AppError("Run auth seed first.", 500);
  }

  let referrerProfile: HydratedDocument<CustomerProfileDocument> | null = null;
  if (input.referralCode) {
    const normalizedCode = normalizeReferralCode(input.referralCode);
    referrerProfile = await CustomerProfile.findOne({ referralCode: normalizedCode });

    if (!referrerProfile) {
      throw new AppError("Referral code is invalid or no longer available.", 400);
    }
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    roleId: role._id,
  });

  const referralCode = await generateUniqueReferralCode(input.name);

  try {
    await CustomerProfile.create({
      userId: user._id,
      referralCode,
      referredByCustomerId: referrerProfile?.userId ?? null,
      marketingWhatsAppOptIn: input.marketingWhatsAppOptIn,
      marketingEmailOptIn: input.marketingEmailOptIn,
    });

    const appliedReferralCode = referrerProfile?.referralCode?.trim();

    if (referrerProfile && appliedReferralCode) {
      await Referral.create({
        referrerCustomerId: referrerProfile.userId,
        referredCustomerId: user._id,
        referralCode: appliedReferralCode,
        status: "signed_up",
      });
    }
  } catch (error) {
    await Promise.all([
      CustomerProfile.deleteOne({ userId: user._id }),
      Referral.deleteOne({ referredCustomerId: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);
    throw error;
  }

  const verificationEmailSent = await issueEmailVerification(user.id, user.email);
  return { user, verificationEmailSent };
}

export async function authenticate(identifier: string, password: string) {
  await connectToDatabase();
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [
      { email: normalizedIdentifier },
      { phone: normalizedIdentifier.replace(/\D/g, "") },
    ],
  }).select(
    "+passwordHash +failedLoginAttempts +lockedUntil",
  );

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("Account temporarily locked.", 423);
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= authConfig.MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(
          Date.now() + authConfig.LOGIN_LOCK_MINUTES * 60_000,
        );
        user.failedLoginAttempts = 0;
      }
      await user.save();
    }
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account deactivated.", 403);
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function createSession(
  user: { id: string; tokenVersion?: number | null },
  metadata: { ipAddress: string; userAgent: string },
  accessTokenTtlSeconds = authConfig.ACCESS_TOKEN_TTL_SECONDS,
) {
  const tokenVersion =
    typeof user.tokenVersion === "number" ? user.tokenVersion : 0;

  if (user.tokenVersion !== tokenVersion) {
    await User.updateOne({ _id: user.id }, { $set: { tokenVersion } });
  }

  const expiresAt = new Date(
    Date.now() + authConfig.REFRESH_TOKEN_TTL_SECONDS * 1000,
  );
  const session = await AuthSession.create({
    userId: user.id,
    refreshTokenHash: "pending",
    expiresAt,
    ...metadata,
  });
  const claims = {
    userId: user.id,
    sessionId: session.id,
    tokenVersion,
  };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(claims, accessTokenTtlSeconds),
    signRefreshToken({
      ...claims,
      tokenId: new Types.ObjectId().toString(),
    }),
  ]);
  session.refreshTokenHash = hashOpaqueToken(refreshToken);
  await session.save();
  return { session, accessToken, refreshToken };
}

export async function rotateSession(
  token: string,
  claims: { userId: string; sessionId: string; tokenVersion: number },
) {
  const [session, user] = await Promise.all([
    AuthSession.findById(claims.sessionId).select("+refreshTokenHash"),
    User.findById(claims.userId),
  ]);

  if (
    !session ||
    !user ||
    !user.isActive ||
    user.tokenVersion !== claims.tokenVersion ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.refreshTokenHash !== hashOpaqueToken(token)
  ) {
    throw new AppError("Invalid session.", 401);
  }

  const role = await Role.findById(user.roleId).select("key isActive").lean();
  const isAdmin = Boolean(
    role?.isActive && role.key !== "customer" && role.key !== "user",
  );
  const accessTokenTtlSeconds = isAdmin
    ? authConfig.ADMIN_ACCESS_TOKEN_TTL_SECONDS
    : authConfig.ACCESS_TOKEN_TTL_SECONDS;

  const nextClaims = {
    userId: user.id,
    sessionId: session.id,
    tokenVersion: user.tokenVersion,
  };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(nextClaims, accessTokenTtlSeconds),
    signRefreshToken({
      ...nextClaims,
      tokenId: new Types.ObjectId().toString(),
    }),
  ]);
  session.refreshTokenHash = hashOpaqueToken(refreshToken);
  session.lastUsedAt = new Date();
  await session.save();
  return { accessToken, refreshToken };
}

export async function issueEmailVerification(userId: string, email: string): Promise<boolean> {
  const rawToken = generateOpaqueToken();
  await SecurityToken.deleteMany({
    userId,
    type: "email_verification",
    consumedAt: null,
  });
  await SecurityToken.create({
    userId,
    type: "email_verification",
    tokenHash: hashOpaqueToken(rawToken),
    expiresAt: new Date(
      Date.now() + authConfig.EMAIL_VERIFICATION_TTL_HOURS * 3_600_000,
    ),
  });
  return sendTransactionalEmail({
    to: email,
    subject: "Verify your TRS account",
    text: `${process.env.APP_URL || "http://localhost:3000"}/verify-email?token=${rawToken}`,
  });
}

export async function issuePasswordReset(email: string) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await SecurityToken.deleteMany({
    userId: user._id,
    type: "password_reset",
    consumedAt: null,
  });
  await SecurityToken.create({
    userId: user._id,
    type: "password_reset",
    tokenHash: hashOpaqueToken(rawToken),
    expiresAt: new Date(
      Date.now() + authConfig.PASSWORD_RESET_TTL_MINUTES * 60_000,
    ),
  });
  await sendTransactionalEmail({
    to: user.email,
    subject: "Reset your TRS password",
    text: `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`,
  });
}
