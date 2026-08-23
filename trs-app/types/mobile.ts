export type MobilePlatform = "android" | "ios";

export type MobileAuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};
