import bcrypt from "bcryptjs";

import config from "../../config/env.js";

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptSaltRounds);
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export { hashPassword, comparePassword };
