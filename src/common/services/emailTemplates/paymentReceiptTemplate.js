function escapeHtml(value) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? `&#8377;${amount.toLocaleString("en-IN")}`
    : "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function detailRow(label, value, isAmount = false) {
  return `
    <tr>
      <td style="padding:10px 12px;color:#64748b;font-size:13px;border-bottom:1px solid #e5eaf2;width:42%;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;color:#132b4f;font-size:13px;font-weight:700;border-bottom:1px solid #e5eaf2;">${isAmount ? value : escapeHtml(value || "-")}</td>
    </tr>`;
}

export function paymentReceiptTemplate({
  studentName,
  studentId,
  courseName,
  batchName,
  branchName,
  branchAddress,
  receiptNumber,
  paymentDate,
  paymentFor,
  paymentMode,
  transactionReference,
  collectedBy,
  amount,
  totalCourseFee,
  totalPaid,
  balance,
  installments = [],
}) {
  const rows = (Array.isArray(installments) ? installments : [])
    .map((installment, index) => {
      const installmentAmount = Number(installment?.amount || 0);
      const amountPaid = Number(installment?.amountPaid ?? installment?.paidAmount ?? 0);
      const status = installmentAmount > 0 && amountPaid >= installmentAmount
        ? "PAID"
        : amountPaid > 0
          ? "PARTIAL"
          : "PENDING";
      const statusColor = status === "PAID" ? "#138a4b" : status === "PARTIAL" ? "#a26000" : "#b96900";
      return `<tr>
        <td style="padding:9px 10px;border-bottom:1px solid #e5eaf2;">Installment ${escapeHtml(installment?.installmentNumber || index + 1)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5eaf2;">${escapeHtml(formatDate(installment?.dueDate))}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5eaf2;text-align:right;">${formatAmount(installmentAmount)}</td>
        <td style="padding:9px 10px;border-bottom:1px solid #e5eaf2;text-align:right;color:${statusColor};font-weight:700;">${status}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Payment Receipt</title></head>
<body style="margin:0;padding:24px 12px;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#132044;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #d8e0eb;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:24px 28px;background:#102b67;color:#ffffff;">
        <div style="font-family:'Arial Narrow','Roboto Condensed',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;font-weight:700;color:#c7d5f5;">CISPRO TRAINING</div>
        <div style="margin-top:7px;font-family:'Arial Narrow','Roboto Condensed',Arial,Helvetica,sans-serif;font-size:26px;letter-spacing:1px;font-weight:900;">PAYMENT RECEIPT</div>
        <div style="margin-top:8px;font-size:13px;color:#dbe7ff;">Payment recorded successfully</div>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:24px;">Hello <strong>${escapeHtml(studentName || "Student")}</strong>, your payment has been received.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e7f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;">
          ${detailRow("Receipt Number", receiptNumber)}
          ${detailRow("Payment Date", formatDate(paymentDate))}
          ${detailRow("Student ID", studentId)}
          ${detailRow("Course", courseName)}
          ${detailRow("Batch", batchName)}
          ${detailRow("Branch", branchName)}
          ${branchAddress ? detailRow("Branch Address", branchAddress) : ""}
          ${detailRow("Payment For", paymentFor)}
          ${detailRow("Payment Mode", paymentMode)}
          ${transactionReference ? detailRow("Transaction Reference", transactionReference) : ""}
          ${detailRow("Collected By", collectedBy)}
        </table>
        <div style="margin-top:20px;padding:18px;text-align:center;border:1px solid #8bd0a8;border-radius:10px;background:#f2fbf5;">
          <div style="font-family:'Arial Narrow','Roboto Condensed',Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;font-weight:700;color:#16834a;">AMOUNT RECEIVED</div>
          <div style="margin-top:4px;font-size:28px;font-weight:900;color:#159447;">${formatAmount(amount)}</div>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #e0e7f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;font-size:12px;">
          <tr style="background:#f1f5fa;color:#102b67;font-weight:700;"><td style="padding:9px 10px;">INSTALLMENT</td><td style="padding:9px 10px;">DUE DATE</td><td style="padding:9px 10px;text-align:right;">AMOUNT</td><td style="padding:9px 10px;text-align:right;">STATUS</td></tr>
          ${rows || `<tr><td colspan="4" style="padding:14px;text-align:center;color:#64748b;">No installment schedule available</td></tr>`}
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid #e5eaf2;">
          ${detailRow("Total Course Fee", formatAmount(totalCourseFee), true)}
          ${detailRow("Total Paid", formatAmount(totalPaid), true)}
          ${detailRow("Remaining Balance", formatAmount(balance), true)}
        </table>
        <p style="margin:22px 0 0;color:#64748b;font-size:12px;line-height:20px;">Please keep this receipt for your records.</p>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e5eaf2;color:#64748b;font-size:11px;text-align:center;">This is a computer-generated receipt from CISPRO Operation Management.</td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

export function paymentReceiptMailTemplate({
  studentName,
  paymentFor,
}) {
  const safeName = escapeHtml(studentName || "Student");
  const safePaymentFor = escapeHtml(paymentFor || "your installment payment");

  return baseTemplate({
    title: "Payment Receipt",
    subtitle: "Your payment receipt PDF is attached to this email.",
    content: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#132b4f;font-size:15px;line-height:26px;">
        <p style="margin:0 0 18px;">Hi <strong>${safeName}</strong>,</p>
        <p style="margin:0 0 18px;">Your <strong>${safePaymentFor}</strong> has been recorded successfully.</p>
        <div style="margin:22px 0;padding:18px 20px;border:1px solid #b8c9e5;border-radius:12px;background:#f5f8ff;color:#1e3a8a;font-size:14px;line-height:23px;">
          Your payment receipt is attached as a PDF. Please download the attached file and keep it for your records.
        </div>
        <p style="margin:20px 0 0;">Thank you,<br><strong>CISPRO Training Team</strong></p>
      </div>
    `,
  });
}
import { baseTemplate } from "./baseTemplate.js";
