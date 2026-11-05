import AppError from "../../common/errors/AppError.js";

const clean = (value) => value === null || value === undefined ? "" : String(value).trim();
const missing = (value) => !clean(value) || ["-", "N/A"].includes(clean(value).toUpperCase());
const moneyInfo = (value) => { if (missing(value)) return { value: null, invalid: false }; const parsed = Number(clean(value).replace(/[\u20B9,]/g, "")); return { value: Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null, invalid: !Number.isFinite(parsed) }; };
const DATE_FORMAT_HINT = "Use DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, or YYYY-MM-DD.";
const dateInfo = (value) => {
  if (missing(value)) return { value: "", invalid: false };
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? { value: "", invalid: true }
      : { value: value.toISOString().slice(0, 10), invalid: false };
  }
  // Reject arbitrary strings/numbers; JavaScript accepts ambiguous values such as 2.4.74537.
  const raw = clean(value);
  const isoMatch = raw.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  const dmyMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!isoMatch && !dmyMatch) return { value: "", invalid: true };
  const year = Number(isoMatch ? isoMatch[1] : dmyMatch[3]);
  const month = Number(isoMatch ? isoMatch[2] : dmyMatch[2]);
  const day = Number(isoMatch ? isoMatch[3] : dmyMatch[1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return { value: "", invalid: true };
  return { value: parsed.toISOString().slice(0, 10), invalid: false };
};
function fields(data, number) {
  const prefix = `installment${number}`;
  const paid = moneyInfo(data[`${prefix}paidamount`]);
  const pending = moneyInfo(data[`${prefix}pendingamount`]);
  const paymentDate = dateInfo(data[`${prefix}paymentdate`]);
  return { paid: paid.value, pending: pending.value, paymentDate: paymentDate.value, mode: (missing(data[`${prefix}modeofcollection`]) ? "" : clean(data[`${prefix}modeofcollection`])) || (missing(data[`${prefix}mode`]) ? "" : clean(data[`${prefix}mode`])), receipt: (missing(data[`${prefix}receiptnumber`]) ? "" : clean(data[`${prefix}receiptnumber`])) || (missing(data[`${prefix}receiptno`]) ? "" : clean(data[`${prefix}receiptno`])), invalidPaid: paid.invalid, invalidPending: pending.invalid, invalidPaymentDate: paymentDate.invalid };
}

function isBlankInstallment(value) {
  return (value.paid === null || value.paid === 0) && (value.pending === null || value.pending === 0) && !value.paymentDate && !value.mode && !value.receipt;
}

function courseScope(student, courseId) {
  if (!student) return null;
  const scope = courseId ? [{ courseId }] : [{ courseId: null }];
  if (String(student.courseId || "") === String(courseId || "")) scope.push({ courseId: null });
  return { branchStudentId: student.id, OR: scope };
}

function existingInstallmentFromLookup(lookup, student, courseId, installmentNumber) {
  if (!lookup?.installmentsByStudent || !student) return null;
  const values = lookup.installmentsByStudent.get(student.id) || [];
  const matches = values.filter((item) => {
    if (Number(item.installmentNumber) !== Number(installmentNumber)) return false;
    if (String(item.courseId || "") === String(courseId || "")) return true;
    return !item.courseId && String(student.courseId || "") === String(courseId || "");
  });
  return matches.sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))[0] || null;
}

export async function validatePaymentImportValues(prisma, student, data, errors, courseId, lookup = null) {
  let hasAnyInstallment = false;
  for (let installmentNumber = 1; installmentNumber <= 10; installmentNumber += 1) {
    const value = fields(data, installmentNumber);
    if (value.invalidPaid) errors.push("Installment " + installmentNumber + " Paid Amount must be a valid number.");
    if (value.invalidPending) errors.push("Installment " + installmentNumber + " Pending Amount must be a valid number.");
    if (value.invalidPaymentDate) errors.push("Installment " + installmentNumber + " Payment Date is invalid. " + DATE_FORMAT_HINT);
    if (value.invalidPaid || value.invalidPending || value.invalidPaymentDate) continue;
    if (isBlankInstallment(value)) continue;
    hasAnyInstallment = true;
    const existingInstallment = student
      ? (lookup ? existingInstallmentFromLookup(lookup, student, courseId, installmentNumber) : await prisma.branchStudentInstallment.findFirst({ where: { ...courseScope(student, courseId), installmentNumber }, orderBy: { updatedAt: "desc" } }))
      : null;
    if ((value.paid === null || value.paid === 0) && (value.pending === null || value.pending === 0) && !existingInstallment?.amount) errors.push("Installment " + installmentNumber + " amount is required.");
    if (value.paid !== null && value.paid < 0) errors.push("Installment " + installmentNumber + " Paid Amount cannot be negative.");
    if (value.pending !== null && value.pending < 0) errors.push("Installment " + installmentNumber + " Pending Amount cannot be negative.");
    if (value.paid !== null && value.paid > 0 && !value.receipt) errors.push("Installment " + installmentNumber + " Receipt Number is required when Paid Amount is entered.");
    if (value.paid !== null && value.paid > 0 && !value.paymentDate) errors.push("Installment " + installmentNumber + " Payment Date is required when Paid Amount is entered.");
    if (value.paid !== null && value.paid > 0 && !value.mode) errors.push("Installment " + installmentNumber + " Mode of Collection is required when Paid Amount is entered.");
    if (value.receipt) {
      const existingPayment = lookup?.paymentsByReceipt
        ? lookup.paymentsByReceipt.get(value.receipt)
        : await prisma.branchStudentPayment.findUnique({ where: { receiptNumber: value.receipt } });
      const belongsToCurrentRecord = Boolean(student && existingPayment && existingPayment.branchStudentId === student.id && (!existingPayment.courseId || String(existingPayment.courseId) === String(courseId || "")));
      if (existingPayment && !belongsToCurrentRecord) errors.push("Receipt Number " + value.receipt + " already belongs to another student or course.");
    }
  }
  if (!hasAnyInstallment) errors.push("At least one installment payment is required.");
}

export async function applyPaymentImportValues(tx, student, branchId, courseId, data, lookup = null) {
  const scope = courseScope(student, courseId);
  for (let installmentNumber = 1; installmentNumber <= 10; installmentNumber += 1) {
    const value = fields(data, installmentNumber);
    if (isBlankInstallment(value)) continue;
    const existingInstallment = lookup
      ? existingInstallmentFromLookup(lookup, student, courseId, installmentNumber)
      : await tx.branchStudentInstallment.findFirst({ where: { ...scope, installmentNumber }, orderBy: { updatedAt: "desc" } });
    const amount = existingInstallment?.amount || Math.round((value.paid || 0) + (value.pending || 0));
    if (!amount && !existingInstallment) throw new AppError("Installment " + installmentNumber + " amount is required.", 400);
    let amountPaid = existingInstallment?.amountPaid || 0;
    if (value.receipt) {
      const existingPayment = lookup?.paymentsByReceipt
        ? lookup.paymentsByReceipt.get(value.receipt)
        : await tx.branchStudentPayment.findUnique({ where: { receiptNumber: value.receipt } });
      if (existingPayment && (existingPayment.branchStudentId !== student.id || (existingPayment.courseId && String(existingPayment.courseId) !== String(courseId)) || (!existingPayment.courseId && String(student.courseId || "") !== String(courseId || "")))) throw new AppError("Receipt Number " + value.receipt + " already belongs to another student or course.", 400);
      const paymentAmount = value.paid || 0;
      const paymentData = { amount: paymentAmount, paymentDate: value.paymentDate ? new Date(value.paymentDate + "T00:00:00.000Z") : existingPayment?.paymentDate || new Date(), paymentMode: value.mode || existingPayment?.paymentMode || "Other", payAgainst: "Installment " + installmentNumber, courseId: courseId || null };
      if (existingPayment) {
        amountPaid = Math.max(0, amountPaid - Number(existingPayment.amount || 0) + paymentAmount);
        await tx.branchStudentPayment.update({ where: { id: existingPayment.id }, data: paymentData });
      } else {
        amountPaid += paymentAmount;
        await tx.branchStudentPayment.create({ data: { ...paymentData, receiptNumber: value.receipt, branchStudentId: student.id, branchId } });
      }
    }
    const pending = Math.max(0, amount - amountPaid);
    const installmentData = { amount: Math.round(amount), amountPaid: Math.round(amountPaid), status: pending > 0 ? "Pending" : "Paid", paymentMethod: value.mode || existingInstallment?.paymentMethod || null, paidAt: pending === 0 && amount > 0 ? new Date() : existingInstallment?.paidAt || null, courseId: courseId || null };
    if (existingInstallment) await tx.branchStudentInstallment.update({ where: { id: existingInstallment.id }, data: installmentData });
    else await tx.branchStudentInstallment.create({ data: { branchStudentId: student.id, installmentNumber, ...installmentData } });
  }
}