import { baseTemplate } from "./baseTemplate.js";

export function studentTemplate({
  fullName,
  email,
  temporaryPassword,
  loginLink,
  resetLink,
}) {
  const body = `

<!-- Welcome -->

<h2
style="
margin:0;
font-size:28px;
color:#132B4F;
font-weight:bold;
">

Welcome, ${fullName} 

</h2>

<p
style="
margin:18px 0 30px;
font-size:15px;
line-height:28px;
color:#666666;
">

Your student account has been successfully created.
Use the credentials below to login to the
<b>CISPRO Operation Management Portal.</b>

</p>

<!-- Details Card -->

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#F8FAFF;
border:1px solid #E5E9F5;
border-radius:10px;
overflow:hidden;
">

<tr>

<td
colspan="2"
style="
background:#EEF3FF;
padding:16px 20px;
font-size:17px;
font-weight:bold;
color:#233B6E;
">

 Student Login Details

</td>

</tr>



<tr>

<td
style="
padding:15px 20px;
font-weight:bold;
color:#444;
">

Email

</td>

<td style="padding:15px 20px;">

${email}

</td>

</tr>

<tr>

<td
style="
padding:15px 20px;
font-weight:bold;
color:#444;
">

Temporary Password

</td>

<td
style="
padding:15px 20px;
font-family:monospace;
font-size:15px;
color:#E11D48;
font-weight:bold;
">

${temporaryPassword}

</td>

</tr>

</table>

<!-- Login Button -->

<div
style="
text-align:center;
margin-top:35px;
">

<a
href="${loginLink}"
style="
display:inline-block;
background:#2563EB;
color:#ffffff;
padding:15px 35px;
text-decoration:none;
border-radius:8px;
font-size:16px;
font-weight:bold;
">

Login to Portal →

</a>

</div>

<!-- Reset Button -->

<div
style="
text-align:center;
margin-top:18px;
">

<a
href="${resetLink}"
style="
display:inline-block;
background:#F97316;
color:#ffffff;
padding:15px 35px;
text-decoration:none;
border-radius:8px;
font-size:16px;
font-weight:bold;
">

Reset Password →

</a>

</div>

<div
style="
margin-top:24px;
padding:16px 18px;
background:#FFF8E6;
border-left:4px solid #F59E0B;
border-radius:8px;
font-size:14px;
line-height:24px;
color:#7C2D12;
">
<b>Important:</b><br>
This reset password link is valid for 1 hour only.
</div>



`;

  return baseTemplate("Student Login Details", body);
}
