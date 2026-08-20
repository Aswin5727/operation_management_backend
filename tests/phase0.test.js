import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import app from "../app.js";
import { hashPassword, comparePassword } from "../src/common/utils/password.js";
import {
  createAccessToken,
  verifyAccessToken,
} from "../src/common/utils/tokens.js";
import {
  parseBranchFacultyPayload,
  ensureUniqueBranchFacultyUserIdentity,
} from "../src/modules/branchFaculty/branchFaculty.service.js";

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

test("branch faculty payload validation rejects missing or malformed fields", () => {
  assert.throws(() => parseBranchFacultyPayload({}), /Faculty ID is required/i);
  assert.throws(
    () => parseBranchFacultyPayload({ facultyId: "FAC-001", name: "Jane", email: "bad-email", phone: "123" }),
    /valid faculty email address|valid 10-digit faculty phone number/i,
  );
});

test("branch faculty payload normalization trims and uppercases values", () => {
  const payload = parseBranchFacultyPayload({
    facultyId: " FAC-001 ",
    name: "  Jane Doe  ",
    email: " JANE@EXAMPLE.COM ",
    phone: "9876543210",
    status: "inactive",
  });

  assert.equal(payload.facultyId, "FAC-001");
  assert.equal(payload.name, "Jane Doe");
  assert.equal(payload.email, "jane@example.com");
  assert.equal(payload.phone, "9876543210");
  assert.equal(payload.status, "INACTIVE");
});

test("branch faculty duplicate phone is rejected before creating user", async () => {
  const prismaMock = {
    user: {
      findFirst: async () => ({
        id: "user_2",
        email: "other@example.com",
        phone: "9876543210",
      }),
    },
  };

  await assert.rejects(
    () => ensureUniqueBranchFacultyUserIdentity(prismaMock, { email: "jane@example.com", phone: "9876543210" }),
    /phone number is already registered/i,
  );
});
