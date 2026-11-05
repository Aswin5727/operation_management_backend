import test from "node:test";
import assert from "node:assert/strict";
import { calculateAdmissionFeeDetails } from "../src/modules/salesAdmin/admissionFeeDetails.js";

function studentFixture({ fee = 30000, installment = 13000, installmentPaid = 0, payments = [], discount = null } = {}) {
  return {
    courseId: "course-1",
    courseName: "Mean Stack",
    courseAmount: fee,
    courseEnrollments: [{
      courseId: "course-1",
      courseName: "Mean Stack",
      totalCourseAmount: discount == null ? fee : fee + discount,
      discountAmount: discount,
      finalCourseAmount: fee,
    }],
    installments: [{ id: "installment-1", courseId: "course-1", installmentNumber: 1, amount: installment, amountPaid: installmentPaid }],
    payments: payments.map((payment, index) => ({
      id: `payment-${index + 1}`,
      courseId: "course-1",
      installmentId: payment.installmentId === false ? null : "installment-1",
      amount: payment.amount,
      paymentMode: payment.initial ? "Sales CRM Credit" : "Cash",
      transactionReference: payment.initial ? "LEAD:CISLEA004" : null,
      installment: { courseId: "course-1", installmentNumber: 1 },
    })),
  };
}

test("Sales CRM initial payment is counted once and reduces both balances", () => {
  const result = calculateAdmissionFeeDetails(studentFixture({
    installmentPaid: 8000,
    payments: [{ amount: 8000, initial: true }],
  }));
  assert.equal(result.initialAmountPaid, 8000);
  assert.equal(result.firstInstallmentAmountPaid, 8000);
  assert.equal(result.firstInstallmentBalance, 5000);
  assert.equal(result.totalAmountPaid, 8000);
  assert.equal(result.overallOutstandingBalance, 22000);
});

test("partial and multiple payments sum without duplicating the initial payment", () => {
  const result = calculateAdmissionFeeDetails(studentFixture({
    installmentPaid: 10000,
    payments: [{ amount: 8000, initial: true }, { amount: 2000 }],
  }));
  assert.equal(result.firstInstallmentBalance, 3000);
  assert.equal(result.totalAmountPaid, 10000);
  assert.equal(result.overallOutstandingBalance, 20000);
});

test("fully paid first installment has no remaining balance", () => {
  const result = calculateAdmissionFeeDetails(studentFixture({
    installmentPaid: 13000,
    payments: [{ amount: 8000, initial: true }, { amount: 5000 }],
  }));
  assert.equal(result.firstInstallmentBalance, 0);
  assert.equal(result.totalAmountPaid, 13000);
});

test("discounted course fee is the outstanding-balance basis", () => {
  const result = calculateAdmissionFeeDetails(studentFixture({
    fee: 27000,
    discount: 3000,
    installmentPaid: 8000,
    payments: [{ amount: 8000, initial: true }],
  }));
  assert.equal(result.totalCourseFee, 27000);
  assert.equal(result.overallOutstandingBalance, 19000);
});

test("overpayment shows credit rather than a negative course balance", () => {
  const result = calculateAdmissionFeeDetails(studentFixture({
    installment: 30000,
    installmentPaid: 35000,
    payments: [{ amount: 35000 }],
  }));
  assert.equal(result.firstInstallmentBalance, 0);
  assert.equal(result.overallOutstandingBalance, 0);
  assert.equal(result.excessCredit, 5000);
});
