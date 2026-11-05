import { baseTemplate } from "./baseTemplate.js";

export function salesAdminTemplate({ fullName, salesAdminId, email, temporaryPassword, branchNames, loginLink, resetLink }) {
  return baseTemplate({
    title: "Sales Admin Account Created",
    subtitle: "Your CISPRO Sales Admin account has been created. Use the temporary password to sign in, then change it immediately.",
    content: `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:1px solid #d8e3f0;border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;">
        <tr><td style="width:38%;padding:16px 18px;background:#edf5ff;color:#173d78;font-weight:700;letter-spacing:.1px;border-bottom:1px solid #d8e3f0;">Sales Admin Name</td><td style="padding:16px 18px;border-bottom:1px solid #d8e3f0;font-weight:500;">${fullName}</td></tr>
        <tr><td style="padding:16px 18px;background:#edf5ff;color:#173d78;font-weight:700;letter-spacing:.1px;border-bottom:1px solid #d8e3f0;">Sales Admin ID</td><td style="padding:16px 18px;border-bottom:1px solid #d8e3f0;color:#173d78;font-weight:800;letter-spacing:.3px;">${salesAdminId || "-"}</td></tr>
        <tr><td style="padding:16px 18px;background:#edf5ff;color:#173d78;font-weight:700;letter-spacing:.1px;border-bottom:1px solid #d8e3f0;">Login Email</td><td style="padding:16px 18px;border-bottom:1px solid #d8e3f0;word-break:break-word;font-weight:500;">${email}</td></tr>
        <tr><td style="padding:16px 18px;background:#edf5ff;color:#173d78;font-weight:700;letter-spacing:.1px;border-bottom:1px solid #d8e3f0;">Assigned Branches</td><td style="padding:16px 18px;border-bottom:1px solid #d8e3f0;font-weight:500;">${branchNames || "-"}</td></tr>
        <tr><td style="padding:16px 18px;background:#fff4e8;color:#b54708;font-weight:700;">Temporary Password</td><td style="padding:16px 18px;color:#8a2c0f;font-weight:800;letter-spacing:.6px;">${temporaryPassword}</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;font-family:Arial,Helvetica,sans-serif;"><tr><td align="center">
        <a href="${resetLink}" style="background:#f97316;color:#fff;text-decoration:none;padding:13px 28px;border-radius:24px;display:inline-block;font-size:14px;font-weight:700;letter-spacing:.1px;margin-right:8px;">Reset Password</a>
        <a href="${loginLink}" style="background:#2563eb;color:#fff;text-decoration:none;padding:13px 30px;border-radius:24px;display:inline-block;font-size:14px;font-weight:700;letter-spacing:.1px;">Login</a>
      </td></tr></table>
      <div style="margin-top:26px;padding:16px 17px;background:#fff9ed;border-left:4px solid #f59e0b;border-radius:7px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:21px;color:#475569;">
        <b style="color:#9a3412;">Important:</b> Use the temporary password only for your first login. Change it immediately after signing in. The reset link expires and can be used only once.
      </div>
    `,
  });
}
