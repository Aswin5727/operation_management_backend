import { fileURLToPath } from "node:url";

import app from "./app.js";
import config from "./src/config/env.js";
import prisma, { warmPrismaConnection } from "./src/config/prisma.js";
import {
  ensureBranchStudentLedgerTable,
  startBranchStudentDueReminderScheduler,
} from "./src/modules/branchStudents/branchStudents.service.js";

const DATABASE_WARMUP_MAX_ATTEMPTS = 3;
const DATABASE_WARMUP_RETRY_MS = 1500;
const DATABASE_KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function warmDatabaseConnection() {
  for (let attempt = 1; attempt <= DATABASE_WARMUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      await warmPrismaConnection();
      if (attempt > 1) {
        console.log(`Database warmup succeeded on attempt ${attempt}.`);
      }
      return true;
    } catch (error) {
      const isLastAttempt = attempt === DATABASE_WARMUP_MAX_ATTEMPTS;
      console.warn(
        `Database warmup attempt ${attempt} failed: ${error?.message || error}`
      );

      if (!isLastAttempt) {
        await wait(DATABASE_WARMUP_RETRY_MS);
      }
    }
  }

  return false;
}

function startDatabaseKeepAlive() {
  if (config.nodeEnv !== "production") {
    return null;
  }

  const timer = setInterval(() => {
    void warmPrismaConnection().catch((error) => {
      console.warn(`Database keep-alive failed: ${error?.message || error}`);
    });
  }, DATABASE_KEEPALIVE_INTERVAL_MS);

  timer.unref?.();
  return timer;
}

function startDueReminderScheduler() {
  const timer = startBranchStudentDueReminderScheduler();
  timer?.unref?.();
  return timer;
}

async function startServer() {
  const warmed = await warmDatabaseConnection();

  if (!warmed) {
    console.warn("Starting server without confirmed database warmup.");
  }

  await ensureBranchStudentLedgerTable().catch((error) => {
    console.warn(`Failed to ensure branch student ledger table: ${error?.message || error}`);
  });

  const keepAliveTimer = startDatabaseKeepAlive();
  const dueReminderTimer = startDueReminderScheduler();
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Backend server running on port ${config.port}`);
  });

  server.on("close", () => {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
    }

    if (dueReminderTimer) {
      clearInterval(dueReminderTimer);
    }

    void prisma.$disconnect().catch((error) => {
      console.warn(`Failed to disconnect Prisma cleanly: ${error?.message || error}`);
    });
  });

  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void startServer();
}

export { app, startServer };
