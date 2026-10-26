export function calculateAdmissionFeeDetails(student) {
  const courses = Array.isArray(student.courseEnrollments) ? student.courseEnrollments : [];
  const courseId = student.courseId || courses[0]?.courseId || null;
  const course = courses.find((item) => item.courseId === courseId) || courses[0] || null;
  const relatedInstallments = (student.installments || []).filter((item) => !item.courseId || !courseId || item.courseId === courseId)
    .sort((a, b) => Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0));
  const firstInstallment = relatedInstallments[0] || null;
  const payments = Array.isArray(student.payments) ? student.payments : [];
  const coursePayments = payments.filter((payment) => {
    if (payment.courseId) return payment.courseId === courseId;
    if (payment.installment?.courseId) return payment.installment.courseId === courseId;
    return courses.length <= 1;
  });
  const totalCourseFee = Math.max(0, Number(course?.finalCourseAmount ?? course?.totalCourseAmount ?? student.courseAmount ?? 0) || 0);
  const totalAmountPaid = coursePayments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0);
  const initialAmountPaid = coursePayments.filter((payment) => payment.paymentMode === "Sales CRM Credit" || String(payment.transactionReference || "").startsWith("LEAD:"))
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0);
  const firstInstallmentAmount = Math.max(0, Number(firstInstallment?.amount || 0));
  const firstInstallmentPaidFromPayments = firstInstallment
    ? coursePayments.filter((payment) => payment.installmentId === firstInstallment.id).reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0)
    : 0;
  const firstInstallmentAmountPaid = Math.max(Number(firstInstallment?.amountPaid || 0), firstInstallmentPaidFromPayments);
  return {
    courseName: course?.courseName || student.courseName || "",
    totalCourseFee,
    firstInstallmentAmount,
    initialAmountPaid,
    firstInstallmentAmountPaid,
    firstInstallmentBalance: Math.max(firstInstallmentAmount - firstInstallmentAmountPaid, 0),
    totalAmountPaid,
    overallOutstandingBalance: Math.max(totalCourseFee - totalAmountPaid, 0),
    excessCredit: Math.max(totalAmountPaid - totalCourseFee, 0),
  };
}
