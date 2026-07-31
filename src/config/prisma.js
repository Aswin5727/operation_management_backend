import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import config from "./env.js";

let prismaClient = null;
let prismaAdapter = null;
let warmupPromise = null;

function createPrismaClient() {
  if (prismaClient) {
    return prismaClient;
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!prismaAdapter) {
    prismaAdapter = new PrismaPg({ connectionString: config.databaseUrl });
  }

  prismaClient = new PrismaClient({ adapter: prismaAdapter });

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
      await client.$queryRawUnsafe("SELECT 1");
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
