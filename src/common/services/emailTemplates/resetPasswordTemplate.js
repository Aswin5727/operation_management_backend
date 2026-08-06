export function resetPasswordTemplate({
  fullName,
  resetLink,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Reset Password</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px;background:#f5f7fb;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#fff;border-radius:12px;overflow:hidden;">

<!-- Header -->
<tr>
<td align="center"
style="background:linear-gradient(135deg,#0F172A,#1E3A8A);
padding:35px;">

<h2 style="margin:0;color:#fff;font-size:26px;">
CISPRO OPERATION MANAGEMENT
</h2>

<p style="margin:10px 0 0;color:#CBD5E1;">
Password Reset Request
</p>

</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#1E293B;">
Hello ${fullName},
</h2>

<p style="font-size:15px;color:#555;line-height:26px;">
We received a request to reset your account password.
Click the button below to create a new password.
</p>

<div style="text-align:center;margin:35px 0;">

<a
href="${resetLink}"
style="
display:inline-block;
padding:15px 40px;
background:#2563EB;
color:#fff;
text-decoration:none;
font-weight:bold;
border-radius:8px;
font-size:16px;
">

Reset Password

</a>

</div>


<div
style="
margin-top:25px;
padding:18px;
background:#FEF3C7;
border-left:4px solid #F59E0B;
border-radius:6px;
">

<strong>Security Notice</strong><br><br>

• This link expires automatically.<br>
• Use it only once.<br>
• Ignore this email if you didn't request a password reset.

</div>

</td>
</tr>

<!-- Footer -->

<tr>
<td
style="
background:#F8FAFC;
padding:25px;
text-align:center;
font-size:13px;
color:#777;
">

© 2026 CISPRO Operation Management

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