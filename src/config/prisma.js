import { PrismaClient } from "../../prisma-client-v2/index.js";
import { PrismaPg } from "@prisma/adapter-pg";

import config from "./env.js";

let prismaClient = null;
let prismaAdapter = null;
let warmupPromise = null;
const runtimeDatabaseUrl =
  config.databaseUrl ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.DIRECT_URL ||
  "";

function createPrismaClient() {
  if (prismaClient) {
    return prismaClient;
  }

  if (!runtimeDatabaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!prismaAdapter) {
    prismaAdapter = new PrismaPg({ connectionString: runtimeDatabaseUrl });
  }

  // Imports and other multi-write workflows can legitimately take longer than
  // Prisma's 5 second interactive transaction default. Keep the default
  // explicit for the adapter as well as for individual transaction callers so
  // a code path that omits options does not unexpectedly expire at commit.
  prismaClient = new PrismaClient({
    adapter: prismaAdapter,
    transactionOptions: {
      maxWait: 30000,
      timeout: 120000,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    global.prisma = prismaClient;
  }

  return prismaClient;
}

async function warmPrismaConnection() {
  if (!warmupPromise) {
    warmupPromise = (async () => {
      const client = createPrismaClient();
      await client.$connect();
      return client;
    })().finally(() => {
      warmupPromise = null;
    });
  }

  return warmupPromise;
}

const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "getPrismaClient") {
        return createPrismaClient;
      }
      if (property === "warmPrismaConnection") {
        return warmPrismaConnection;
      }
      const client = createPrismaClient();
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

export { createPrismaClient, warmPrismaConnection };
export default prisma;
