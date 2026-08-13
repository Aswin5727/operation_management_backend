export function branchWelcomeTemplate({
  fullName,
  branchName,
  branchId,
  branchAddress,
  loginLink,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to CISPRO Branch Portal</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:35px 0;background:#f3f6fb;">
<tr>
<td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,.08);">
<tr>
<td style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:42px;text-align:center;">
<h2 style="margin:0;color:#fff;font-size:28px;">WELCOME TO CISPRO</h2>
<p style="margin:12px 0 0;color:#dbeafe;font-size:15px;">Branch Administration Dashboard</p>
</td>
</tr>
<tr>
<td style="padding:40px;">
<h2 style="margin-top:0;font-size:28px;color:#1f2937;">Hello ${fullName},</h2>
<p style="font-size:16px;line-height:28px;color:#555;">
Welcome to your branch administration dashboard. Your first login was successful and your account is now active.
</p>
<table width="100%" cellpadding="18" style="margin-top:28px;background:#f8fbff;border:1px solid #e2e8f0;border-radius:10px;">
<tr>
<td>
<h3 style="margin:0 0 12px;color:#2563eb;">BRANCH INFORMATION</h3>
${branchId ? `<p style="margin:10px 0;"><strong>Branch ID :</strong> ${branchId}</p>` : ""}
${branchName ? `<p style="margin:10px 0;"><strong>Branch Name :</strong> ${branchName}</p>` : ""}
${branchAddress ? `<p style="margin:10px 0;"><strong>Location :</strong> ${branchAddress}</p>` : ""}
<p style="margin:10px 0;"><strong>Status :</strong> Active</p>
</td>
</tr>
</table>
<div style="text-align:center;margin-top:35px;">
<a
href="${loginLink}"
style="display:inline-block;padding:16px 42px;background:linear-gradient(90deg,#2563EB,#4F46E5);color:#fff;text-decoration:none;font-size:17px;font-weight:bold;border-radius:8px;">
Go To Branch Dashboard
</a>
</div>
<table width="100%" style="margin-top:35px;background:#ecfdf5;border-left:5px solid #10b981;border-radius:6px;">
<tr>
<td style="padding:18px;">
<b>Getting Started</b>
<ul style="margin:12px 0 0 18px;padding:0;color:#444;line-height:28px;">
<li>Review your branch profile details.</li>
<li>Monitor students, courses, and batches.</li>
<li>Track pending payments and branch activity.</li>
<li>Coordinate branch operations from one dashboard.</li>
</ul>
</td>
</tr>
</table>
<p style="margin-top:35px;color:#666;line-height:28px;">
If you need support, please contact the super admin or system administrator.
</p>
</td>
</tr>
<tr>
<td style="background:#F8FAFC;padding:25px;text-align:center;color:#888;font-size:13px;">
© 2026 CISPRO Operation Management
<br><br>
This is an automated email. Please do not reply.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`;
}
