import test from "node:test";
import assert from "node:assert/strict";

import { buildNotificationWhere } from "../src/modules/notifications/notifications.service.js";

const visibleKinds = new Set(["BRANCH_LOGIN", "STUDENT_DISCONTINUATION"]);

test("Branch Admin notification reads include only its branch and its own targeted notices", () => {
  const where = buildNotificationWhere({
    user: { id: "admin-a", role: "BRANCH_ADMIN" },
    branchScope: { targetBranchId: "branch-a" },
    visibleKinds,
    unreadOnly: true,
  });

  assert.deepEqual(where.OR, [
    { targetBranchId: "branch-a" },
    { targetUserId: "admin-a" },
  ]);
  assert.deepEqual(where.kind, { in: [...visibleKinds] });
  assert.equal(where.read, false);
  assert.ok(where.NOT);
});

test("Branch Admin queries fail closed when no branch identity can be resolved", () => {
  const where = buildNotificationWhere({
    user: { id: "admin-a", role: "BRANCH_ADMIN" },
    branchScope: {},
    visibleKinds,
  });

  assert.equal(where.targetUserId, "admin-a");
  assert.equal(Object.hasOwn(where, "OR"), false);
  assert.deepEqual(where.kind, { in: [...visibleKinds] });

  const unresolvedWhere = buildNotificationWhere({
    user: { role: "BRANCH_ADMIN" },
    branchScope: {},
    visibleKinds,
  });
  assert.equal(unresolvedWhere.targetUserId, "__unresolved_branch_admin__");
});

test("Super Admin notification queries retain the global role scope and visibility filter", () => {
  const where = buildNotificationWhere({
    user: { id: "super-admin", role: "SUPER_ADMIN" },
    branchScope: {},
    visibleKinds,
  });

  assert.deepEqual(where.kind, { in: [...visibleKinds] });
  assert.ok(Array.isArray(where.OR));
  assert.equal(Object.hasOwn(where, "targetBranchId"), false);
});
test("Branch Admin follow-up notifications are assignee scoped", () => {
  const visibleKindsWithFollowUps = new Set([
    "BRANCH_LOGIN",
    "LEAD_FOLLOW_UP_SCHEDULED",
    "LEAD_FOLLOW_UP_DUE",
    "LEAD_FOLLOW_UP_OVERDUE",
  ]);
  const where = buildNotificationWhere({
    user: { id: "admin-a", role: "BRANCH_ADMIN" },
    branchScope: { targetBranchId: "branch-a" },
    visibleKinds: visibleKindsWithFollowUps,
    unreadOnly: true,
  });

  assert.ok(Array.isArray(where.OR));
  const branchScope = where.OR.find((scope) => scope.targetBranchId === "branch-a");
  const ownScope = where.OR.find((scope) => scope.targetUserId === "admin-a");
  assert.ok(branchScope);
  assert.ok(ownScope);
  assert.ok(!branchScope.kind.in.includes("LEAD_FOLLOW_UP_DUE"));
  assert.ok(ownScope.kind.in.includes("LEAD_FOLLOW_UP_DUE"));

  const specific = buildNotificationWhere({
    user: { id: "admin-a", role: "BRANCH_ADMIN" },
    branchScope: { targetBranchId: "branch-a" },
    visibleKinds: visibleKindsWithFollowUps,
    kind: "LEAD_FOLLOW_UP_DUE",
    unreadOnly: true,
  });
  assert.equal(specific.targetUserId, "admin-a");
  assert.equal(specific.kind, "LEAD_FOLLOW_UP_DUE");
  assert.equal(Object.hasOwn(specific, "OR"), false);
});
