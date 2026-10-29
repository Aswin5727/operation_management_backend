const LEAD_ID_PREFIX = "CISLEA";

function asciiLetters(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * The requested admin code uses the first two consonants of the admin name.
 * This keeps the example Tamil -> TM while still producing a stable two-letter code.
 */
export function adminLeadCode(fullName) {
  const letters = asciiLetters(fullName);
  const consonants = letters.replace(/[AEIOU]/g, "");
  const source = consonants.length >= 2 ? consonants : letters;
  return (source + "XX").slice(0, 2);
}

export function formatAdminLeadId(prefix, sequence) {
  const normalizedPrefix = String(prefix || "XX").replace(/[^A-Z]/gi, "").toUpperCase().slice(0, 2).padEnd(2, "X");
  return "CISLEA" + normalizedPrefix + String(sequence).padStart(3, "0");
}

function highestSequence(rows, prefix) {
  const expectedPrefix = "CISLEA" + prefix;
  return rows.reduce((highest, row) => {
    const match = new RegExp("^" + expectedPrefix + "(\\d+)$", "i").exec(String(row.leadId || ""));
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);
}

async function existingPrefixSequence(client, ownerId) {
  return client.leadIdSequence.findUnique({
    where: { ownerId },
    select: { prefix: true, nextNumber: true },
  });
}

export async function peekAdminLeadId(client, ownerId, fullName) {
  const stored = await existingPrefixSequence(client, ownerId);
  if (stored) return formatAdminLeadId(stored.prefix, stored.nextNumber);

  const prefix = adminLeadCode(fullName);
  const rows = await client.lead.findMany({
    where: { createdById: ownerId, leadId: { startsWith: "CISLEA" + prefix } },
    select: { leadId: true },
  });
  return formatAdminLeadId(prefix, highestSequence(rows, prefix) + 1);
}

/**
 * Allocates one ID. Callers must hold a transaction-scoped advisory lock for ownerId.
 */
export async function allocateAdminLeadId(client, ownerId, fullName) {
  const stored = await existingPrefixSequence(client, ownerId);
  if (stored) {
    await client.leadIdSequence.update({
      where: { ownerId },
      data: { nextNumber: { increment: 1 } },
    });
    return formatAdminLeadId(stored.prefix, stored.nextNumber);
  }

  const prefix = adminLeadCode(fullName);
  const rows = await client.lead.findMany({
    where: { createdById: ownerId, leadId: { startsWith: "CISLEA" + prefix } },
    select: { leadId: true },
  });
  const sequence = highestSequence(rows, prefix) + 1;
  await client.leadIdSequence.create({
    data: { ownerId, prefix, nextNumber: sequence + 1 },
  });
  return formatAdminLeadId(prefix, sequence);
}
