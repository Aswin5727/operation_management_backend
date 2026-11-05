import { baseTemplate } from "./baseTemplate.js";

export function facultyTemplate({
  fullName,
  email,
  facultyId,
  temporaryPassword,
  courseName,
  batchNames = [],
  loginLink,
  resetLink,
}) {
  return baseTemplate({
    title: "Faculty Account Created",
    subtitle:
      "Your faculty account has been created successfully. Please use the credentials below to login.",

    content: `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;">
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Faculty Name</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">${fullName}</td>
        </tr>

        ${
          facultyId
            ? `
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Faculty ID</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">${facultyId}</td>
        </tr>`
            : ""
        }

        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Email</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">${email}</td>
        </tr>

        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Temporary Password</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">${temporaryPassword}</td>
        </tr>

        ${
          courseName
            ? `
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Course</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">${courseName}</td>
        </tr>`
            : ""
        }

        ${
          batchNames.length
            ? `
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;"><b>Batches</b></td>
          <td style="padding:12px;border:1px solid #e5e7eb;">
            ${batchNames.join(", ")}
          </td>
        </tr>`
            : ""
        }

      </table>

      <div style="text-align:center;margin-top:30px;">
        <a href="${loginLink}"
          style="
            background:#1d4ed8;
            color:#fff;
            text-decoration:none;
            padding:14px 30px;
            border-radius:8px;
            display:inline-block;
            font-weight:bold;
            margin-right:10px;">
          Login Portal
        </a>

        <a href="${resetLink}"
          style="
            background:#ea580c;
            color:#fff;
            text-decoration:none;
            padding:14px 30px;
            border-radius:8px;
            display:inline-block;
            font-weight:bold;">
          Reset Password
        </a>
      </div>

      <div style="
        margin-top:30px;
        padding:16px;
        background:#fff8e6;
        border-left:4px solid #f59e0b;
        border-radius:6px;
        font-size:14px;
        color:#444;">
        <b>Important:</b><br>
        Login using the temporary password and change it immediately after your first login. This reset password link remains valid until you use it to set your password.
      </div>
    `,
  });
}
