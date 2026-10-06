import { baseTemplate } from "./baseTemplate.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function studentTemplate({
  fullName,
  email,
  studentCode,
  courseName,
  facultyName,
  batchName,
  batchTiming,
  courses = [],
  temporaryPassword,
  loginLink,
  resetLink,
}) {
  const safeFullName = String(fullName || "Student").trim();
  const safeEmail = String(email || "-").trim();
  const safeStudentCode = String(studentCode || "-").trim();
  const safeCourseName = String(courseName || "").trim();
  const safeFacultyName = String(facultyName || "").trim();
  const safeBatchName = String(batchName || "").trim();
  const safeBatchTiming = String(batchTiming || "").trim();
  const safeTemporaryPassword = String(temporaryPassword || "").trim();
  const safeCourses = Array.isArray(courses) ? courses.filter((course) => course && typeof course === "object") : [];
  const courseDetailRow = (label, value) => value
    ? `<tr><td style="width:36%;padding:9px 12px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td><td style="padding:9px 12px;background:#ffffff;color:#0f172a;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(value)}</td></tr>`
    : "";
  const courseDetailsRows = safeCourses.map((course, index) => `
    <tr>
      <td colspan="2" style="padding:14px 18px;background:#eff6ff;color:#1e3a8a;font-size:14px;font-weight:700;border-bottom:1px solid #bfdbfe;">
        Course ${index + 1}: ${escapeHtml(course.courseName || `Course ${index + 1}`)}${course.status ? ` <span style="font-size:12px;color:#475569;">(${escapeHtml(course.status)})</span>` : ""}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-collapse:collapse;background:#ffffff;font-weight:400;">
          ${courseDetailRow("Course Mode", course.courseMode)}
          ${courseDetailRow("Faculty Name", course.facultyName)}
          ${courseDetailRow("Batch", course.batchName)}
          ${courseDetailRow("Batch Timing", course.batchTiming)}
          ${courseDetailRow("Class Schedule", course.classSchedule)}
          ${courseDetailRow("Course Duration", course.courseDuration)}
          ${courseDetailRow("Course Start Date", course.courseStartDate)}
          ${courseDetailRow("Course End Date", course.courseEndDate)}
          ${courseDetailRow("Course Fee", course.courseAmount)}
          ${courseDetailRow("Payment Plan", course.paymentPlan)}
        </table>
      </td>
    </tr>`).join("");

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
          ${safeFullName} has been registered successfully${safeCourses.length > 1 ? ` for ${safeCourses.length} courses. Course details are below.` : ". Faculty and batch will be allocated to you shortly."}
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
          <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">
            ${safeEmail}
          </td>
        </tr>
        ${safeCourses.length > 1 ? courseDetailsRows : `
          ${safeCourseName ? `<tr><td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">Course</td><td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(safeCourseName)}</td></tr>` : ""}
          ${safeFacultyName ? `<tr><td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">Faculty Name</td><td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(safeFacultyName)}</td></tr>` : ""}
          ${safeBatchName ? `<tr><td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">Batch</td><td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${escapeHtml(safeBatchName)}</td></tr>` : ""}
          ${safeBatchTiming ? `<tr><td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;">Batch Timing</td><td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(safeBatchTiming)}</td></tr>` : ""}
        `}
        ${safeTemporaryPassword ? `<tr><td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;">Temporary Password</td><td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:700;letter-spacing:.4px;">${escapeHtml(safeTemporaryPassword)}</td></tr>` : ""}
      </table>

      <div style="text-align:center;margin-top:28px;">
        ${loginLink ? `<a href="${escapeHtml(loginLink)}" style="background:#2563eb;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;display:inline-block;font-weight:700;margin:0 6px 10px 0;">Login to Student Portal</a>` : ""}
        ${resetLink ? `<a href="${escapeHtml(resetLink)}" style="background:#ea580c;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;display:inline-block;font-weight:700;margin:0 0 10px 6px;">Reset Password</a>` : ""}
      </div>

      <div style="margin-top:18px;padding:15px 18px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:6px;font-size:14px;line-height:22px;color:#334155;">
        Use the temporary password to sign in. Your student dashboard will remind you to reset it. This reset link remains valid until you use it to set your password.
      </div>
    </div>
  `;

  return baseTemplate({
    title: "CISPRO Training Registration",
    subtitle: "",
    content,
  });
}
