import { baseTemplate } from "./baseTemplate.js";

export function branchTemplate({
  fullName,
  email,
  temporaryPassword,
  branchId,
  branchName,
  roleAccess,
  resetLink,
  loginLink,
}) {
  return baseTemplate({
    title: "Branch Admin Account Created",
    subtitle:
      "Your branch admin account is ready. Please review the branch details below and reset your temporary password before your first login.",
    content: `
      <div style="margin-top:10px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <div style="
          background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);
          border-radius:16px;
          padding:24px 24px;
          color:#ffffff;
          box-shadow:0 10px 28px rgba(29,78,216,.16);
        ">
          <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#bfdbfe;font-weight:700;">
            Branch Access Created
          </div>
          <div style="margin-top:10px;font-size:26px;line-height:34px;font-weight:700;">
            Welcome, ${fullName}
          </div>
          <div style="margin-top:8px;font-size:14px;line-height:23px;color:#dbeafe;">
            Your branch administration account has been provisioned successfully.
          </div>
        </div>
      </div>

      <div style="margin-top:26px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">
          Branch Information
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0;background:#ffffff;">
          <tr>
            <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">
              Branch Name
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">
              ${branchName || "-"}
            </td>
          </tr>
          <tr>
            <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;">
              Role Access
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;">
              ${roleAccess === "BRANCH_ADMIN_SALES_ADMIN" ? "Branch Admin + Sales Admin" : "Branch Admin Only"}
            </td>
          </tr>
          <tr>
            <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">
              Branch ID
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">
              ${branchId || "-"}
            </td>
          </tr>
          <tr>
            <td style="width:34%;padding:15px 18px;background:#f8fafc;color:#334155;font-size:13px;font-weight:700;">
              Branch Admin
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;">
              ${fullName}
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top:24px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">
          Login Credentials
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe4f0;border-radius:16px;overflow:hidden;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="width:38%;padding:15px 18px;background:#eff6ff;color:#1e3a8a;font-size:13px;font-weight:700;border-bottom:1px solid #dbe4f0;">
              Login Email
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #dbe4f0;word-break:break-word;">
              ${email}
            </td>
          </tr>
          <tr>
            <td style="width:38%;padding:15px 18px;background:#eff6ff;color:#1e3a8a;font-size:13px;font-weight:700;">
              Temporary Password
            </td>
            <td style="padding:15px 18px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:700;letter-spacing:.4px;word-break:break-word;">
              ${temporaryPassword}
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:30px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <a href="${resetLink}"
          style="
            background:linear-gradient(90deg,#ea580c 0%,#f97316 100%);
            color:#fff;
            text-decoration:none;
            padding:15px 34px;
            border-radius:999px;
            display:inline-block;
            font-weight:700;
            font-size:15px;
            box-shadow:0 12px 24px rgba(249,115,22,.25);">
          Reset Password
        </a>
        ${
          loginLink
            ? `
        <a href="${loginLink}"
          style="
            margin-left:12px;
            background:linear-gradient(90deg,#1d4ed8 0%,#2563eb 100%);
            color:#fff;
            text-decoration:none;
            padding:15px 34px;
            border-radius:999px;
            display:inline-block;
            font-weight:700;
            font-size:15px;
            box-shadow:0 12px 24px rgba(37,99,235,.22);">
          Login
        </a>`
            : ""
        }
      </div>

      <div style="
        margin-top:30px;
        padding:18px 20px;
        background:#fff8e6;
        border:1px solid #fde68a;
        border-radius:14px;
        font-size:14px;
        line-height:24px;
        color:#7c2d12;
        font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
        <b style="color:#9a3412;">Important:</b><br>
        Please use the temporary password only for first-time access. Reset your password immediately and keep your branch credentials secure.
      </div>
    `,
  });
}
