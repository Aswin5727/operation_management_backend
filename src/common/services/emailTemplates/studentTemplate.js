import { baseTemplate } from "./baseTemplate.js";

export function studentTemplate({
  fullName,
  email,
  studentCode,
}) {
  const safeFullName = String(fullName || "Student").trim();
  const safeEmail = String(email || "-").trim();
  const safeStudentCode = String(studentCode || "-").trim();

  const content = `
    <div style="margin-top:10px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
      <div style="
        background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);
        border-radius:16px;
        padding:24px;
        color:#ffffff;
        box-shadow:0 10px 28px rgba(37,99,235,.18);
      ">
        <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#bfdbfe;font-weight:700;">
          CISPRO Training Registration
        </div>
        <div style="margin-top:10px;font-size:26px;line-height:34px;font-weight:700;">
          Registered Student
        </div>
        <div style="margin-top:8px;font-size:14px;line-height:23px;color:#dbeafe;">
          ${safeFullName} has been registered successfully. Faculty and batch will be allocated to you shortly.
        </div>
      </div>
    </div>

    <div style="margin-top:26px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
      <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">
        Student Information
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0;background:#ffffff;">
        <tr>
          <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">
            Student Name
          </td>
          <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">
            ${safeFullName}
          </td>
        </tr>
        <tr>
          <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">
            Student ID
          </td>
          <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">
            ${safeStudentCode}
          </td>
        </tr>
        <tr>
          <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;">
            Email
          </td>
          <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;">
            ${safeEmail}
          </td>
        </tr>
      </table>
    </div>
  `;

  return baseTemplate({
    title: "CISPRO Training Registration",
    subtitle: "",
    content,
  });
}
