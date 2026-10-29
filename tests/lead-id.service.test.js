import test from "node:test";
import assert from "node:assert/strict";
import { adminLeadCode, allocateAdminLeadId, formatAdminLeadId, peekAdminLeadId } from "../src/modules/leads/leadId.service.js";

function fakeClient(existingRows = []) {
  let sequence = null;
  return {
    lead: {
      findMany: async () => existingRows.map((leadId) => ({ leadId })),
    },
    leadIdSequence: {
      findUnique: async () => sequence ? { ...sequence } : null,
      create: async ({ data }) => { sequence = { prefix: data.prefix, nextNumber: data.nextNumber }; return sequence; },
      update: async ({ data }) => { sequence.nextNumber += data.nextNumber.increment; return sequence; },
    },
  };
}

test("admin Lead ID code follows the requested two-consonant format", () => {
  assert.equal(adminLeadCode("Tamil"), "TM");
  assert.equal(adminLeadCode("Janani"), "JN");
  assert.equal(formatAdminLeadId("tm", 1), "CISLEATM001");
});

test("admin Lead ID sequence is independent per owner and does not reuse numbers", async () => {
  const tamil = fakeClient();
  assert.equal(await allocateAdminLeadId(tamil, "owner-tamil", "Tamil"), "CISLEATM001");
  assert.equal(await allocateAdminLeadId(tamil, "owner-tamil", "Tamil"), "CISLEATM002");
  assert.equal(await peekAdminLeadId(tamil, "owner-tamil", "Tamil"), "CISLEATM003");

  const janani = fakeClient();
  assert.equal(await allocateAdminLeadId(janani, "owner-janani", "Janani"), "CISLEAJN001");
});

test("existing old-format rows do not force a new admin into branch-wide numbering", async () => {
  const tamil = fakeClient(["CISLEA018", "CISLEA019"]);
  assert.equal(await peekAdminLeadId(tamil, "owner-tamil", "Tamil"), "CISLEATM001");
});
