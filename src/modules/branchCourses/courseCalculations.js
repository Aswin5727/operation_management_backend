import AppError from "../../common/errors/AppError.js";

export function distributeBasisPoints(count) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) {
    throw new AppError("A hierarchy can contain at most 10,000 items", 400);
  }
  if (!count) return [];
  const base = Math.floor(10000 / count);
  return Array.from({ length: count }, (_, i) => i === count - 1 ? 10000 - base * (count - 1) : base);
}
export function distributePercentages(count) {
  return distributeBasisPoints(count).map((value) => value / 100);
}
// Preserve the manual form's existing nearest-1,000 installment policy.
export function buildCourseInstallments(total, count) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isInteger(count) || count < 1 || count > 120) {
    throw new AppError("Invalid fee or installment count (maximum 120)", 400);
  }
  if (count === 1) return [total];
  let amount = Math.round((total / count) / 1000) * 1000;
  while (amount > 0 && amount * (count - 1) > total) amount -= 1000;
  return [...Array(count - 1).fill(amount), total - amount * (count - 1)];
}
export function courseFinancialPreview({ finalFee, installmentCounts = [], moduleSubmoduleCounts = [] }) {
  if (!Array.isArray(moduleSubmoduleCounts) || moduleSubmoduleCounts.length > 1000 ||
      !Array.isArray(installmentCounts) || installmentCounts.length > 120) {
    throw new AppError("Invalid preview counts", 400);
  }
  return {
    paymentPlans: installmentCounts.map((count) => buildCourseInstallments(Number(finalFee), Number(count))),
    modules: distributePercentages(moduleSubmoduleCounts.length).map((percentage, i) => ({
      percentage, submodules: distributePercentages(Number(moduleSubmoduleCounts[i])),
    })),
  };
}
