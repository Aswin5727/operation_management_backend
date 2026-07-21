import nodemailer from "nodemailer";
import { Resend } from "resend";

import config from "../../config/env.js";
import AppError from "../errors/AppError.js";

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

    url.hash = `${normalizedPathname}${query.toString() ? `?${query.toString()}` : ""}`;
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

  if (sendGridEnabled) {
    try {
      return await sendWithSendGrid({ to: recipient, subject, html, text, replyTo });
    } catch (error) {
      if (!resendEnabled && !gmailEnabled) {
        throw error;
      }

      console.warn("SendGrid mail failed, falling back to other providers:", error);
    }
  }

  if (resendEnabled) {
    try {
      return await sendWithResend({ to: recipient, subject, html, text, replyTo });
    } catch (error) {
      if (!gmailEnabled) {
        throw error;
      }

      console.warn("Resend mail failed, falling back to Gmail SMTP:", error);
    }
  }

  return sendWithNodemailer({ to: recipient, subject, html, text, replyTo });
}

function buildResetLink(resetToken, temporaryPassword = "") {
  return buildAppUrl("/reset-password", {
    token: resetToken,
    temporaryPassword,
  });
}

function buildLoginLink() {
  return buildAppUrl("/login");
}

export async function sendPasswordResetEmail({ to, resetToken }) {
  const token = String(resetToken || "").trim();
  const resetLink = buildResetLink(token);
  const fallbackText = token ? `Reset token: ${token}` : "Reset token unavailable";

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your CISPRO account password.</p>
      ${resetLink ? `<p><a href="${escapeHtml(resetLink)}">Reset your password</a></p>` : ""}
      ${
        resetLink
          ? `<p>If the link does not open, copy this URL:<br /><code>${escapeHtml(resetLink)}</code></p>`
          : `<p>Your reset token is <strong>${escapeHtml(token)}</strong>.</p>`
      }
      <p>This reset link will expire soon. If you did not request this, you can ignore this email.</p>
    </div>
  `;

  const text = resetLink
    ? `Reset your CISPRO password: ${resetLink}\n\nIf you did not request this, ignore this email.`
    : `${fallbackText}\n\nIf you did not request this, ignore this email.`;

  return sendEmail({
    to,
    subject: "Reset your CISPRO password",
    html,
    text,
  });
}

export async function sendStudentCredentialsEmail({ to, fullName, studentCode, temporaryPassword, resetToken }) {
  const loginLink = buildLoginLink();
  const resetLink = buildResetLink(resetToken, temporaryPassword);
  const safeName = escapeHtml(fullName || "Student");
  const safeCode = escapeHtml(studentCode || "");
  const safePassword = escapeHtml(temporaryPassword || "");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Welcome to CISPRO</h2>
      <p>Hello ${safeName},</p>
      <p>Your student account has been created successfully.</p>
      <p><strong>Login email:</strong> ${escapeHtml(to)}</p>
      ${safeCode ? `<p><strong>Student code:</strong> ${safeCode}</p>` : ""}
      <p><strong>Temporary password:</strong> ${safePassword}</p>
      ${loginLink ? `<p><a href="${escapeHtml(loginLink)}">Login to CISPRO</a></p>` : ""}
      ${resetLink ? `<p><a href="${escapeHtml(resetLink)}">Reset your password</a></p>` : ""}
      <p>Use the temporary password to sign in, then change it using the reset link.</p>
    </div>
  `;

  const textParts = [
    `Welcome to CISPRO, ${fullName || "Student"}.`,
    `Login email: ${to}`,
    safeCode ? `Student code: ${studentCode}` : null,
    `Temporary password: ${temporaryPassword}`,
    loginLink ? `Login link: ${loginLink}` : null,
    resetLink ? `Reset link: ${resetLink}` : null,
    "Use the temporary password to sign in, then change it using the reset link.",
  ].filter(Boolean);

  return sendEmail({
    to,
    subject: "Your CISPRO student login details",
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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Welcome to CISPRO Student Portal</h2>
      <p>Hello ${safeName},</p>
      <p>You have successfully logged in to your student dashboard for the first time.</p>
      ${courseLine}
      ${loginLink ? `<p><a href="${escapeHtml(loginLink)}">Open CISPRO dashboard</a></p>` : ""}
    </div>
  `;

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
  facultyCode,
  temporaryPassword,
  resetToken,
  courseName,
  batchNames = [],
}) {
  const loginLink = buildLoginLink();
  const resetLink = buildResetLink(resetToken, temporaryPassword);
  const safeName = escapeHtml(fullName || "Faculty");
  const safeCode = escapeHtml(facultyCode || "");
  const safePassword = escapeHtml(temporaryPassword || "");
  const normalizedBatchNames = Array.isArray(batchNames)
    ? batchNames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Welcome to CISPRO Faculty Portal</h2>
      <p>Hello ${safeName},</p>
      <p>Your faculty account has been created successfully.</p>
      <p><strong>Login email:</strong> ${escapeHtml(to)}</p>
      ${safeCode ? `<p><strong>Faculty code:</strong> ${safeCode}</p>` : ""}
      ${courseName ? `<p><strong>Course:</strong> ${escapeHtml(courseName)}</p>` : ""}
      ${
        normalizedBatchNames.length
          ? `<p><strong>Batches:</strong> ${escapeHtml(normalizedBatchNames.join(", "))}</p>`
          : ""
      }
      <p><strong>Temporary password:</strong> ${safePassword}</p>
      ${loginLink ? `<p><a href="${escapeHtml(loginLink)}">Login to CISPRO</a></p>` : ""}
      ${resetLink ? `<p><a href="${escapeHtml(resetLink)}">Reset your password</a></p>` : ""}
      <p>Use the temporary password to sign in, then change it using the reset link.</p>
    </div>
  `;

  const textParts = [
    `Welcome to CISPRO Faculty Portal, ${fullName || "Faculty"}.`,
    `Login email: ${to}`,
    safeCode ? `Faculty code: ${facultyCode}` : null,
    courseName ? `Course: ${courseName}` : null,
    normalizedBatchNames.length ? `Batches: ${normalizedBatchNames.join(", ")}` : null,
    `Temporary password: ${temporaryPassword}`,
    loginLink ? `Login link: ${loginLink}` : null,
    resetLink ? `Reset link: ${resetLink}` : null,
    "Use the temporary password to sign in, then change it using the reset link.",
  ].filter(Boolean);

  return sendEmail({
    to,
    subject: "Your CISPRO faculty login details",
    html,
    text: textParts.join("\n"),
  });
}

export async function sendFacultyWelcomeEmail({ to, fullName, courseName, batchNames = [] }) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Faculty");
  const normalizedBatchNames = Array.isArray(batchNames)
    ? batchNames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Welcome to CISPRO Faculty Portal</h2>
      <p>Hello ${safeName},</p>
      <p>You have successfully logged in to your faculty dashboard for the first time.</p>
      ${courseName ? `<p>Your assigned course: <strong>${escapeHtml(courseName)}</strong></p>` : ""}
      ${
        normalizedBatchNames.length
          ? `<p>Your batches: <strong>${escapeHtml(normalizedBatchNames.join(", "))}</strong></p>`
          : ""
      }
      ${loginLink ? `<p><a href="${escapeHtml(loginLink)}">Open CISPRO dashboard</a></p>` : ""}
    </div>
  `;

  const text = [
    `Welcome to CISPRO Faculty Portal, ${fullName || "Faculty"}.`,
    "You have successfully logged in to your faculty dashboard for the first time.",
    courseName ? `Assigned course: ${courseName}` : null,
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
