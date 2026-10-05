import dotenv from "dotenv";

dotenv.config();

export const splitCsvValues = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const pickPrimaryUrl = (value) => splitCsvValues(value)[0] || "";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseMotivationMailThresholds = (value) => {
  const thresholds = String(value || "3,5,8")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
  const unique = [...new Set(thresholds)].sort((left, right) => left - right);
  return unique.length >= 3 ? unique.slice(0, 3) : [3, 5, 8];
};

const buildDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.PRISMA_DATABASE_URL) {
    return process.env.PRISMA_DATABASE_URL;
  }

  const host = process.env.DB_HOST || "";
  const port = process.env.DB_PORT || "";
  const name = process.env.DB_NAME || "";
  const user = process.env.DB_USER || "";
  const password = process.env.DB_PASSWORD || "";

  if (!host || !port || !name || !user || !password) {
    return "";
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${name}?schema=public`;
};

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 4000),
  databaseUrl: buildDatabaseUrl(),
  frontendUrl: pickPrimaryUrl(
    process.env.FRONTEND_URL || process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || "",
  ),
  corsOrigins:
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    "",
  corsOrigin:
    process.env.CORS_ORIGINS ||
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    "",
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: toNumber(process.env.EMAIL_PORT, 587),
  emailSecure: process.env.EMAIL_SECURE === "true",
  emailUser: process.env.EMAIL_USER || "",
  emailPass: String(process.env.EMAIL_PASS || "").replaceAll(/\s+/g, ""),
  emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || "",
  sendgridApiKey: process.env.SENDGRID_API_KEY || "",
  sendgridFrom:
    process.env.SENDGRID_FROM ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  passwordResetTokenExpiresMinutes: toNumber(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    15
  ),
  credentialResetTokenExpiresMinutes: toNumber(
    process.env.CREDENTIAL_RESET_TOKEN_EXPIRES_MINUTES,
    60
  ),
  forgotPasswordResetTokenExpiresMinutes: toNumber(
    process.env.FORGOT_PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    2
  ),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  loginAttemptMax: toNumber(process.env.LOGIN_ATTEMPT_MAX, 5),
  loginAttemptWindowMinutes: toNumber(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES, 15),
  // The live frontend and API are hosted on different origins, so production
  // auth cookies must be cross-site compatible unless explicitly overridden.
  // Render/live deployments use HTTPS even when NODE_ENV is not explicitly
  // set. Infer secure cross-site cookies from the configured frontend URL so
  // refresh cookies are still sent by a frontend hosted on another origin.
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : ((process.env.NODE_ENV || "development") === "production" ||
        /^https:\/\//i.test(process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "")),
  cookieSameSite:
    process.env.COOKIE_SAME_SITE ||
    (((process.env.NODE_ENV || "development") === "production" ||
      /^https:\/\//i.test(process.env.FRONTEND_URL || process.env.CORS_ORIGIN || ""))
      ? "none"
      : "lax"),
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD || "ChangeMe123!",
  motivationMailThresholds: parseMotivationMailThresholds(process.env.MOTIVATION_MAIL_THRESHOLDS),
  motivationMailSweepIntervalMs: toNumber(process.env.MOTIVATION_MAIL_SWEEP_INTERVAL_MS, 24 * 60 * 60 * 1000),
};

export default config;
