import nodemailer from "nodemailer";
import { Resend } from "resend";

import config from "../../config/env.js";
import AppError from "../errors/AppError.js";

import { studentTemplate } from "./emailTemplates/studentTemplate.js";
import { welcomeTemplate } from "./emailTemplates/welcomeTemplate.js";
import { resetPasswordTemplate } from "./emailTemplates/resetPasswordTemplate.js";
import { facultyTemplate } from "./emailTemplates/facultyTemplate.js";
import { branchTemplate } from "./emailTemplates/branchTemplate.js";
import { branchWelcomeTemplate } from "./emailTemplates/branchWelcomeTemplate.js";

let cachedTransporter = null;
let cachedResendClient = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBaseUrl() {
  return String(config.frontendUrl || "").trim();
}

function buildAppUrl(pathname, searchParams = {}) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return "";

  try {
    const url = new URL(baseUrl);
    const normalizedPathname = String(pathname || "").startsWith("/")
      ? String(pathname || "").trim()
      : `/${String(pathname || "").trim()}`;
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value).trim());
      }
    }

    url.pathname = normalizedPathname;
    url.search = query.toString() ? `?${query.toString()}` : "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function hasGmailConfig() {
  return Boolean(config.emailUser && config.emailPass && config.emailFrom);
}

function hasSendGridConfig() {
  return Boolean(config.sendgridApiKey && config.sendgridFrom);
}

function hasResendConfig() {
  return Boolean(config.resendApiKey && config.emailFrom);
}

function ensureMailerReady() {
  if (hasSendGridConfig() || hasResendConfig() || hasGmailConfig()) {
    return;
  }

  throw new AppError(
    "Email service is not configured. Set SENDGRID_API_KEY with SENDGRID_FROM, or set RESEND_API_KEY with EMAIL_FROM, or set EMAIL_USER, EMAIL_PASS and EMAIL_FROM.",
    500,
  );
}

function getResendClient() {
  if (cachedResendClient) {
    return cachedResendClient;
  }

  if (!config.resendApiKey) {
    return null;
  }

  cachedResendClient = new Resend(config.resendApiKey);
  return cachedResendClient;
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  ensureMailerReady();

  const baseTransportConfig = {
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
    authMethod: "LOGIN",
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    family: 4,
    tls: {
      minVersion: "TLSv1.2",
    },
  };

  cachedTransporter = config.emailHost === "smtp.gmail.com"
    ? nodemailer.createTransport({
      service: "gmail",
      secure: false,
      requireTLS: true,
      ...baseTransportConfig,
    })
    : nodemailer.createTransport({
      host: config.emailHost,
      port: config.emailPort,
      secure: config.emailSecure,
      requireTLS: !config.emailSecure,
      ...baseTransportConfig,
    });

  return cachedTransporter;
}

async function sendWithResend({ to, subject, html, text, replyTo }) {
  const resend = getResendClient();
  if (!resend) {
    throw new AppError("RESEND_API_KEY is not configured", 500);
  }

  const result = await resend.emails.send({
    from: config.emailFrom,
    to: [to],
    subject,
    html,
    text,
    replyTo: replyTo || undefined,
  });

  return result;
}

async function sendWithNodemailer({ to, subject, html, text, replyTo }) {
  ensureMailerReady();

  if (!hasGmailConfig()) {
    throw new AppError("EMAIL_USER, EMAIL_PASS and EMAIL_FROM are required for SMTP mail", 500);
  }

  const transporter = getTransporter();
  console.log("HTML Exists:", !!html);
  console.log("HTML Length:", html?.length);
  console.log(html?.substring(0, 300));

  return transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    html,
    text,
    replyTo: replyTo || undefined,
  });
}

async function sendWithSendGrid({ to, subject, html, text, replyTo }) {
  if (!hasSendGridConfig()) {
    throw new AppError("SENDGRID_API_KEY or SENDGRID_FROM is not configured", 500);
  }

  const content = [];

  if (text) {
    content.push({
      type: "text/plain",
      value: text,
    });
  }

  if (html) {
    content.push({
      type: "text/html",
      value: html,
    });
  }

  if (!content.length) {
    throw new AppError("Email content is empty", 500);
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          ...(replyTo ? { reply_to: { email: replyTo } } : {}),
        },
      ],
      from: { email: config.sendgridFrom },
      subject,
      content,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new AppError(
      `SendGrid failed with status ${response.status}${responseText ? `: ${responseText}` : ""}`,
      502,
    );
  }

  return {
    provider: "sendgrid",
    accepted: [to],
    messageId: `sendgrid-${Date.now()}`,
  };
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const recipient = String(to || "").trim();
  if (!recipient) {
    throw new AppError("Recipient email is required", 400);
  }

  const sendGridEnabled = hasSendGridConfig();
  const resendEnabled = hasResendConfig();
  const gmailEnabled = hasGmailConfig();

  if (!sendGridEnabled && !resendEnabled && !gmailEnabled) {
    ensureMailerReady();
  }
  if (gmailEnabled) {
    try {
      return await sendWithNodemailer({
        to: recipient,
        subject,
        html,
        text,
        replyTo,
      });
    } catch (error) {
      console.warn("Gmail failed:", error);
    }
  }

  if (resendEnabled) {
    try {
      return await sendWithResend({
        to: recipient,
        subject,
        html,
        text,
        replyTo,
      });
    } catch (error) {
      console.warn("Resend failed:", error);
    }
  }

  if (sendGridEnabled) {
    return await sendWithSendGrid({
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    });
  }

  throw new AppError("No email provider configured", 500);
}

function buildResetLink(resetToken, temporaryPassword = "", extraSearchParams = {}) {
  return buildAppUrl("/reset-password", {
    token: resetToken,
    temporaryPassword,
    ...extraSearchParams,
  });
}

function buildLoginLink() {
  return buildAppUrl("/login");
}

export async function sendPasswordResetEmail({ to, resetToken, expiryMinutes = 2 }) {
  const token = String(resetToken || "").trim();
  const resetLink = buildResetLink(token);
  const fallbackText = token ? `Reset token: ${token}` : "Reset token unavailable";

  const html = resetPasswordTemplate({
    fullName: "User",
    resetLink,
    expiryMinutes,
  });

  const text = resetLink
    ? `Reset your CISPRO password: ${resetLink}\n\nThis reset link is valid for ${expiryMinutes} ${expiryMinutes === 1 ? "minute" : "minutes"} only.\n\nIf you did not request this, ignore this email.`
    : `${fallbackText}\n\nThis reset link is valid for ${expiryMinutes} ${expiryMinutes === 1 ? "minute" : "minutes"} only.\n\nIf you did not request this, ignore this email.`;

  return sendEmail({
    to,
    subject: "Reset your CISPRO password",
    html,
    text,
  });
}

export async function sendStudentCredentialsEmail({ to, fullName, studentCode, temporaryPassword, resetToken }) {
  const safeName = escapeHtml(fullName || "Student");
  const safeCode = escapeHtml(studentCode || "-");

  const html = studentTemplate({
    fullName: safeName,
    email: to,
    studentCode: safeCode,
  });


  const textParts = [
    `CISPRO Training registration completed for ${safeName}.`,
    safeCode ? `Student ID: ${safeCode}` : null,
    `Email: ${to}`,
  ].filter(Boolean);

  return sendEmail({
    to,
    subject: "Your CISPRO Student Login Details",
    html,
    text: textParts.join("\n"),
  });
}

export async function sendStudentWelcomeEmail({ to, fullName, courseName }) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Student");
  const safeCourseName = escapeHtml(courseName || "");
  const courseLine = safeCourseName
    ? `<p>Your enrolled course: <strong>${safeCourseName}</strong></p>`
    : "";

  const html = welcomeTemplate({
    fullName: safeName,
    courseName: safeCourseName,
    loginLink,
  });

  const text = [
    `Welcome to CISPRO Student Portal, ${fullName || "Student"}.`,
    "You have successfully logged in to your student dashboard for the first time.",
    courseName ? `Your enrolled course: ${courseName}` : null,
    loginLink ? `Dashboard/login link: ${loginLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: "Welcome to CISPRO Student Portal",
    html,
    text,
  });
}

export async function sendFacultyCredentialsEmail({
  to,
  fullName,
  facultyId,
  temporaryPassword,
  resetToken,
  courseName,
  batchNames = [],
}) {
  const loginLink = buildLoginLink();
  const resetLink = buildResetLink(resetToken, temporaryPassword);
  const safeName = escapeHtml(fullName || "Faculty");
  const safeFacultyId = escapeHtml(facultyId || "");
  const safePassword = escapeHtml(temporaryPassword || "");
  const normalizedBatchNames = Array.isArray(batchNames)
    ? batchNames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const html = facultyTemplate({
    fullName: safeName,
    email: to,
    facultyId: safeFacultyId,
    temporaryPassword: safePassword,
    courseName,
    batchNames: normalizedBatchNames,
    loginLink,
    resetLink,
  });
  const textParts = [
    `CISPRO Faculty Login Details for ${fullName || "Faculty"}.`,
    `Login email: ${to}`,
    facultyId ? `Faculty ID: ${facultyId}` : null,
    courseName ? `Course: ${courseName}` : null,
    normalizedBatchNames.length ? `Batches: ${normalizedBatchNames.join(", ")}` : null,
    `Temporary password: ${temporaryPassword}`,
    loginLink ? `Login link: ${loginLink}` : null,
    resetLink ? `Reset link: ${resetLink}` : null,
    "This reset password link is valid for 1 hour only.",
    "Use the temporary password to sign in, then change it using the reset link.",
  ].filter(Boolean);

  console.log(" sendFacultyCredentialsEmail called");
  console.log("HTML =>");
  console.log(html);

  return sendEmail({
    to,
    subject: "Your CISPRO faculty login details",
    html,
    text: textParts.join("\n"),
  });
}

export async function sendFacultyWelcomeEmail({ to, fullName, facultyId, courseName, batchNames = [] }) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Faculty");
  const safeFacultyId = escapeHtml(facultyId || "");
  const safeCourseName = escapeHtml(courseName || "");
  const normalizedBatchNames = Array.isArray(batchNames)
    ? batchNames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const html = welcomeTemplate({
    fullName: safeName,
    facultyId: safeFacultyId,
    courseName: safeCourseName,
    loginLink,
  });

  const text = [
    `Welcome to CISPRO Faculty Portal, ${fullName || "Faculty"}.`,
    "You have successfully logged in to your faculty dashboard for the first time.",
    facultyId ? `Faculty ID: ${facultyId}` : null,
    courseName ? `Assigned course: ${courseName}` : null,
    courseName ? `Your enrolled course: ${courseName}` : null,
    normalizedBatchNames.length ? `Your batches: ${normalizedBatchNames.join(", ")}` : null,
    loginLink ? `Dashboard/login link: ${loginLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: "Welcome to CISPRO Faculty Portal",
    html,
    text,
  });
}

export async function sendBranchCredentialsEmail({
  to,
  fullName,
  temporaryPassword,
  resetToken,
  branchId,
  branchName,
}) {
  const resetLink = buildResetLink(resetToken, temporaryPassword, {
    redirect: "/login",
  });
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Branch Admin");
  const safePassword = escapeHtml(temporaryPassword || "");
  const safeBranchId = escapeHtml(branchId || "");
  const safeBranchName = escapeHtml(branchName || "");

  const html = branchTemplate({
    fullName: safeName,
    email: to,
    temporaryPassword: safePassword,
    branchId: safeBranchId,
    branchName: safeBranchName,
    resetLink,
    loginLink,
  });

  const text = [
    `CISPRO Branch Login Details for ${fullName || "Branch Admin"}.`,
    branchName ? `Branch Name: ${branchName}` : null,
    `Login email: ${to}`,
    `Temporary password: ${temporaryPassword}`,
    branchId ? `Branch ID: ${branchId}` : null,
    loginLink ? `Login link: ${loginLink}` : null,
    resetLink ? `Reset link: ${resetLink}` : null,
    "This reset password link is valid for 1 hour only.",
    "Reset your password first, then use the common CISPRO login page to sign in.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: "Your CISPRO branch login details",
    html,
    text,
  });
}

export async function sendBranchWelcomeEmail({
  to,
  fullName,
  branchId,
  branchName,
  branchAddress,
}) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Branch Admin");
  const safeBranchId = escapeHtml(branchId || "");
  const safeBranchName = escapeHtml(branchName || "");
  const safeBranchAddress = escapeHtml(branchAddress || "");

  const html = branchWelcomeTemplate({
    fullName: safeName,
    branchId: safeBranchId,
    branchName: safeBranchName,
    branchAddress: safeBranchAddress,
    loginLink,
  });

  const text = [
    `Welcome to CISPRO Branch Portal, ${fullName || "Branch Admin"}.`,
    "You have successfully logged in to your branch dashboard for the first time.",
    branchId ? `Branch ID: ${branchId}` : null,
    branchName ? `Branch name: ${branchName}` : null,
    branchAddress ? `Location: ${branchAddress}` : null,
    loginLink ? `Branch dashboard link: ${loginLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: "Welcome to CISPRO Branch Portal",
    html,
    text,
  });
}

export async function sendFacultyCourseAssignmentEmail({
  to,
  fullName,
  facultyId,
  courseName,
}) {
  const loginLink = buildLoginLink();

  const safeName = escapeHtml(fullName || "Faculty");
  const safeFacultyId = escapeHtml(facultyId || "");
  const safeCourseName = escapeHtml(courseName || "");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
      <h2>Course Assigned</h2>

      <p>Hello ${safeName},</p>

      <p>
        A course has been assigned to you in the CISPRO Faculty Portal.
      </p>

      <p>
        <strong>Faculty ID:</strong> ${safeFacultyId}
      </p>

      <p>
        <strong>Assigned Course:</strong> ${safeCourseName}
      </p>

      ${
        loginLink
          ? `
            <p>
              <a href="${loginLink}">
                Open Faculty Dashboard
              </a>
            </p>
          `
          : ""
      }

      <p>
        Regards,<br />
        CISPRO Team
      </p>
    </div>
  `;

  const text = [
    `Hello ${fullName || "Faculty"},`,
    "",
    "A course has been assigned to you.",
    `Faculty ID: ${facultyId || ""}`,
    `Assigned Course: ${courseName || ""}`,
    loginLink
      ? `Faculty Dashboard: ${loginLink}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: `Course Assigned - ${courseName}`,
    html,
    text,
  });
}
