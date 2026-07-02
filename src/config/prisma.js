const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const config = require("./env");

let prismaClient = null;

function createPrismaClient() {
  if (prismaClient) {
    return prismaClient;
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  prismaClient = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    global.prisma = prismaClient;
  }

  return prismaClient;
}

const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "getPrismaClient") {
        return createPrismaClient;
      }
      const client = createPrismaClient();
      const value = client[property];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);

module.exports = prisma;
