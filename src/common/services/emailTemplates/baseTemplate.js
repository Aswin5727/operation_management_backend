export function baseTemplate({
  title,
  subtitle,
  content,
}) {
  return `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">

<title>${title}</title>

</head>

<body style="
margin:0;
padding:0;
background:#EEF2F7;
font-family:Arial,Helvetica,sans-serif;
-webkit-text-size-adjust:100%;
-ms-text-size-adjust:100%;
color-scheme:light;
supported-color-schemes:light;
">

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#EEF2F7;
padding:35px 15px;
">

<tr>

<td align="center">

<table
width="600"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
border-radius:14px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,.08);
max-width:600px;
width:100%;
">

<!-- ================= HEADER ================= -->

<tr>

<td
style="
background:#132B4F;
padding:28px;
text-align:center;
">

<div
style="
font-size:26px;
font-weight:bold;
color:#ffffff;
letter-spacing:.5px;
">

CISPRO

</div>

<div
style="
font-size:14px;
margin-top:6px;
color:#C7D5F5;
">

Operation Management Platform

</div>

<div
style="
width:70px;
height:4px;
background:#FFB400;
margin:18px auto 0;
border-radius:50px;
">

</div>

</td>

</tr>

<!-- ================= BODY ================= -->

<tr>

<td
style="
padding:35px 32px;
">

${subtitle ? `
<div
style="
font-size:15px;
color:#64748B;
text-align:center;
line-height:24px;
margin-bottom:28px;
">
${subtitle}
</div>
` : ""}

${content}

</td>

</tr>


<!-- ================= FOOTER ================= -->

<tr>

<td
style="
background:#F8F9FC;
padding:24px;
text-align:center;
border-top:1px solid #ECECEC;
">

<div
style="
font-size:13px;
color:#777;
line-height:24px;
">

© 2026
<b>CISPRO Operation Management</b>

<br>

All Rights Reserved.

</div>

<div
style="
margin-top:12px;
">

<a
href="#"
style="
color:#4F46E5;
text-decoration:none;
font-size:13px;
">

Privacy Policy

</a>

&nbsp;&nbsp;|&nbsp;&nbsp;

<a
href="#"
style="
color:#4F46E5;
text-decoration:none;
font-size:13px;
">

Terms of Service

</a>

</div>

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
