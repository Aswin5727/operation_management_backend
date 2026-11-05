import jwt from "jsonwebtoken";

import config from "../../config/env.js";

function createAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    },
    config.jwtAccessSecret,
    {
      subject: user.id,
      expiresIn: config.jwtAccessExpiresIn,
    }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.refreshTokenVersion,
    },
    config.jwtRefreshSecret,
    {
      subject: user.id,
      expiresIn: config.jwtRefreshExpiresIn,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
