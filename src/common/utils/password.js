const bcrypt = require("bcryptjs");
const config = require("../../config/env");

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptSaltRounds);
}

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
