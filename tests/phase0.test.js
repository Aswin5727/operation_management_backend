import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import app from "../app.js";
import { hashPassword, comparePassword } from "../src/common/utils/password.js";
import {
  createAccessToken,
  verifyAccessToken,
} from "../src/common/utils/tokens.js";

test("password hashing and comparison works", async () => {
  const hash = await hashPassword("Secret123!");
  assert.equal(await comparePassword("Secret123!", hash), true);
  assert.equal(await comparePassword("WrongSecret!", hash), false);
});

test("jwt access token can be created and verified", () => {
  const token = createAccessToken({
    id: "user_1",
    role: "BUSINESS_OWNER",
    refreshTokenVersion: 2,
  });

  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, "user_1");
  assert.equal(payload.role, "BUSINESS_OWNER");
  assert.equal(payload.tokenVersion, 2);
});

test("health endpoint responds", async () => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, "ok");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("login endpoint validates required fields", async () => {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.message, /required/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
