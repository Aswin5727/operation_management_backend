export function welcomeTemplate({
  fullName,
  courseName,
  loginLink,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to CISPRO</title>
</head>

<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:35px 0;background:#f3f6fb;">
<tr>
<td align="center">

<table width="620" cellpadding="0" cellspacing="0"
style="
background:#ffffff;
border-radius:14px;
overflow:hidden;
box-shadow:0 10px 25px rgba(0,0,0,.08);
">

<!-- HEADER -->

<tr>
<td
style="
background:linear-gradient(135deg,#1E3A8A,#2563EB);
padding:45px;
text-align:center;
">

<div
style="
width:70px;
height:70px;
border-radius:50%;
background:#fff;
display:inline-flex;
align-items:center;
justify-content:center;
font-size:34px;
">

</div>

<h2
style="
margin:20px 0 0;
color:#fff;
font-size:28px;
">
WELCOME TO CISPRO
</h2>

<p
style="
margin:12px 0 0;
color:#DCE9FF;
font-size:15px;
">
Operation Management Platform
</p>

</td>
</tr>

<!-- BODY -->

<tr>
<td style="padding:40px;">

<h2
style="
margin-top:0;
font-size:30px;
color:#1F2937;
">
Hello ${fullName},
</h2>

<p
style="
font-size:16px;
line-height:28px;
color:#555;
">
Congratulations! 
</p>

<p
style="
font-size:16px;
line-height:28px;
color:#555;
">
Your account has been successfully activated.
Welcome to the <strong>CISPRO Operation Management Platform</strong>.
</p>

<table
width="100%"
cellpadding="18"
style="
margin-top:28px;
background:#F8FAFF;
border:1px solid #E2E8F0;
border-radius:10px;
">

<tr>
<td>

<h3
style="
margin:0 0 12px;
color:#2563EB;
">
ACCOUNT INFORMATION
</h3>

<p style="margin:10px 0;">
<strong>Name :</strong>
${fullName}
</p>

${
courseName
? `
<p style="margin:10px 0;">
<strong>Course :</strong>
${courseName}
</p>
`
: ""
}

<p style="margin:10px 0;">
<strong>Status :</strong>
Active
</p>

</td>
</tr>

</table>

<div
style="
text-align:center;
margin-top:35px;
">

<a
href="${loginLink}"
style="
display:inline-block;
padding:16px 42px;
background:linear-gradient(90deg,#2563EB,#4F46E5);
color:#fff;
text-decoration:none;
font-size:17px;
font-weight:bold;
border-radius:8px;
">

Go To Dashboard →

</a>

</div>

<table
width="100%"
style="
margin-top:35px;
background:#ECFDF5;
border-left:5px solid #10B981;
border-radius:6px;
">

<tr>
<td style="padding:18px;">

<b>Getting Started</b>

<ul style="margin:12px 0 0 18px;padding:0;color:#444;line-height:28px;">
<li>Complete your profile.</li>
<li>Check your assigned course.</li>
<li>View your batches.</li>
<li>Track attendance & performance.</li>
</ul>

</td>
</tr>

</table>

<p
style="
margin-top:35px;
color:#666;
line-height:28px;
">

If you have any questions or need assistance,
please contact your administrator.

</p>

</td>
</tr>

<!-- FOOTER -->

<tr>
<td
style="
background:#F8FAFC;
padding:25px;
text-align:center;
color:#888;
font-size:13px;
">

© 2026 CISPRO Operation Management

<br><br>

This is an automated email.
Please do not reply.

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