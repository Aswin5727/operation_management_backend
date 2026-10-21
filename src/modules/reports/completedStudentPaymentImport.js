import AppError from "../../common/errors/AppError.js";

const clean = (value) => value === null || value === undefined ? "" : String(value).trim();
const missing = (value) => !clean(value) || ["-", "N/A"].includes(clean(value).toUpperCase());
const moneyInfo = (value) => { if (missing(value)) return { value: null, invalid: false }; const parsed = Number(clean(value).replace(/[Ã¢â€šÂ¹,]/g, "")); return { value: Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null, invalid: !Number.isFinite(parsed) }; };
const dateInfo = (value) => { const raw = clean(value); if (missing(raw)) return { value: "", invalid: false }; const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/); const year = Number(match ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : 0); const parsed = match ? new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[1]))) : new Date(raw); if (Number.isNaN(parsed.getTime())) return { value: "", invalid: true }; if (match && (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== Number(match[2]) - 1 || parsed.getUTCDate() !== Number(match[1]))) return { value: "", invalid: true }; return { value: parsed.toISOString().slice(0, 10), invalid: false }; };

function fields(data, number) {
  const prefix = `installment${number}`;
  const paid = moneyInfo(data[`${prefix}paidamount`]);
  const pending = moneyInfo(data[`${prefix}pendingamount`]);
  const paymentDate = dateInfo(data[`${prefix}paymentdate`]);
  return { paid: paid.value, pending: pending.value, paymentDate: paymentDate.value, mode: (missing(data[`${prefix}modeofcollection`]) ? "" : clean(data[`${prefix}modeofcollection`])) || (missing(data[`${prefix}mode`]) ? "" : clean(data[`${prefix}mode`])), receipt: (missing(data[`${prefix}receiptnumber`]) ? "" : clean(data[`${prefix}receiptnumber`])) || (missing(data[`${prefix}receiptno`]) ? "" : clean(data[`${prefix}receiptno`])), invalidPaid: paid.invalid, invalidPending: pending.invalid, invalidPaymentDate: paymentDate.invalid };
}

function courseScope(student, courseId) {
  if (!student) return null;
  const scope = courseId ? [{ courseId }] : [{ courseId: null }];
  if (String(student.courseId || "") === String(courseId || "")) scope.push({ courseId: null });
  return { branchStudentId: student.id, OR: scope };
}

export async function validatePaymentImportValues(prisma, student, data, errors, courseId) {
  let hasAnyInstallment = false;
  for (let installmentNumber = 1; installmentNumber <= 10; installmentNumber += 1) {
    const value = fields(data, installmentNumber);
    if (value.invalidPaid) errors.push(`Installment ${installmentNumber} Paid Amount must be a valid number.`);
    if (value.invalidPending) errors.push(`Installment ${installmentNumber} Pending Amount must be a valid number.`);
    if (value.invalidPaymentDate) errors.push(`Installment ${installmentNumber} Payment Date is invalid.`);
    if (value.invalidPaid || value.invalidPending || value.invalidPaymentDate) continue;
    if ([value.paid, value.pending, value.paymentDate, value.mode, value.receipt].every((item) => item === null || item === "")) continue;
    hasAnyInstallment = true;
    if ((value.paid === null || value.paid === 0) && (value.pending === null || value.pending === 0)) {
      const existingInstallment = student ? await prisma.branchStudentInstallment.findFirst({ where: { ...courseScope(student, courseId), installmentNumber }, orderBy: { updatedAt: "desc" } }) : null;
      if (!existingInstallment?.amount) errors.push(`Installment ${installmentNumber} amount is required.`);
    }
    if (value.paid !== null && value.paid < 0) errors.push(`Installment ${installmentNumber} Paid Amount cannot be negative.`);
    if (value.pending !== null && value.pending < 0) errors.push(`Installment ${installmentNumber} Pending Amount cannot be negative.`);
    if (value.paid !== null && value.paid > 0 && !value.receipt) errors.push(`Installment ${installmentNumber} Receipt Number is required when Paid Amount is entered.`);
    if (value.paid !== null && value.paid > 0 && !value.paymentDate) errors.push(`Installment ${installmentNumber} Payment Date is required when Paid Amount is entered.`);
    if (value.paid !== null && value.paid > 0 && !value.mode) errors.push(`Installment ${installmentNumber} Mode of Collection is required when Paid Amount is entered.`);
  }
  if (!hasAnyInstallment) errors.push("At least one installment payment is required.");
}

export async function applyPaymentImportValues(tx, student, branchId, courseId, data) {
  const scope = courseScope(student, courseId);
  for (let installmentNumber = 1; installmentNumber <= 10; installmentNumber += 1) {
    const value = fields(data, installmentNumber); if ([value.paid, value.pending, value.paymentDate, value.mode, value.receipt].every((item) => item === null || item === "")) continue;
    const existingInstallment = await tx.branchStudentInstallment.findFirst({ where: { ...scope, installmentNumber }, orderBy: { updatedAt: "desc" } }); const amount = existingInstallment?.amount || Math.round((value.paid || 0) + (value.pending || 0));
    if (!amount && !existingInstallment) throw new AppError(`Installment ${installmentNumber} amount is required.`, 400);
    let amountPaid = existingInstallment?.amountPaid || 0;
    if (value.receipt) {
      const existingPayment = await tx.branchStudentPayment.findUnique({ where: { receiptNumber: value.receipt } }); if (existingPayment && (existingPayment.branchStudentId !== student.id || (existingPayment.courseId && String(existingPayment.courseId) !== String(courseId)) || (!existingPayment.courseId && String(student.courseId || "") !== String(courseId || "")))) throw new AppError(`Receipt Number ${value.receipt} already belongs to another student or course.`, 400);
      const paymentAmount = value.paid || 0; const paymentData = { amount: paymentAmount, paymentDate: value.paymentDate ? new Date(`${value.paymentDate}T00:00:00.000Z`) : existingPayment?.paymentDate || new Date(), paymentMode: value.mode || existingPayment?.paymentMode || "Other", payAgainst: `Installment ${installmentNumber}`, courseId: courseId || null };
      if (existingPayment) { amountPaid = Math.max(0, amountPaid - Number(existingPayment.amount || 0) + paymentAmount); await tx.branchStudentPayment.update({ where: { id: existingPayment.id }, data: paymentData }); } else { amountPaid += paymentAmount; await tx.branchStudentPayment.create({ data: { ...paymentData, receiptNumber: value.receipt, branchStudentId: student.id, branchId } }); }
    }
    const pending = Math.max(0, amount - amountPaid); const installmentData = { amount: Math.round(amount), amountPaid: Math.round(amountPaid), status: pending > 0 ? "Pending" : "Paid", paymentMethod: value.mode || existingInstallment?.paymentMethod || null, paidAt: pending === 0 && amount > 0 ? new Date() : existingInstallment?.paidAt || null, courseId: courseId || null };
    if (existingInstallment) await tx.branchStudentInstallment.update({ where: { id: existingInstallment.id }, data: installmentData }); else await tx.branchStudentInstallment.create({ data: { branchStudentId: student.id, installmentNumber, ...installmentData } });
  }
}