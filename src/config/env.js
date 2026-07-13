import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  corsOrigin: process.env.CORS_ORIGIN || "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12),
  passwordResetTokenExpiresMinutes: toNumber(
    process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES,
    15
  ),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  loginAttemptMax: toNumber(process.env.LOGIN_ATTEMPT_MAX, 5),
  loginAttemptWindowMinutes: toNumber(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES, 15),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
  seedDefaultPassword: process.env.SEED_DEFAULT_PASSWORD || "ChangeMe123!",
};

export default config;
