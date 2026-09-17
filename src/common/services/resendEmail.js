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
import { alertTemplate } from "./emailTemplates/alertTemplate.js";
import { paymentReceiptMailTemplate } from "./emailTemplates/paymentReceiptTemplate.js";

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

async function sendWithResend({ to, subject, html, text, replyTo, attachments }) {
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
    attachments: attachments?.length
      ? attachments.map((attachment) => ({
          ...attachment,
          content: Buffer.from(String(attachment.content || ""), "base64"),
        }))
      : undefined,
  });

  return result;
}

async function sendWithNodemailer({ to, subject, html, text, replyTo, attachments }) {
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
    attachments: attachments?.length
      ? attachments.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.from(String(attachment.content || ""), "base64"),
        }))
      : undefined,
  });
}

async function sendWithSendGrid({ to, subject, html, text, replyTo, attachments }) {
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
      ...(attachments?.length ? { attachments } : {}),
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

async function sendEmail({ to, subject, html, text, replyTo, attachments }) {
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
        attachments,
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
        attachments,
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
      attachments,
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

export async function sendStudentCredentialsEmail({ to, fullName, studentCode, temporaryPassword, resetToken, courseName, facultyName, batchName, batchTiming }) {
  const safeName = escapeHtml(fullName || "Student");
  const safeCode = escapeHtml(studentCode || "-");
  const loginLink = buildLoginLink();
  const resetLink = buildResetLink(resetToken, temporaryPassword);
  const safeEmail = escapeHtml(to || "");
  const safePassword = escapeHtml(temporaryPassword || "");

  const html = studentTemplate({
    fullName: safeName,
    email: safeEmail,
    studentCode: safeCode,
    courseName: escapeHtml(courseName || ""),
    facultyName: escapeHtml(facultyName || ""),
    batchName: escapeHtml(batchName || ""),
    batchTiming: escapeHtml(batchTiming || ""),
    temporaryPassword: safePassword,
    loginLink,
    resetLink,
  });


  const textParts = [
    `CISPRO Training registration completed for ${safeName}.`,
    safeCode ? `Student ID: ${safeCode}` : null,
    `Email: ${to}`,
    courseName ? `Course: ${courseName}` : null,
    facultyName ? `Faculty: ${facultyName}` : null,
    batchName ? `Batch: ${batchName}` : null,
    batchTiming ? `Batch timing: ${batchTiming}` : null,
    `Temporary password: ${temporaryPassword || ""}`,
    loginLink ? `Login link: ${loginLink}` : null,
    resetLink ? `Reset password link: ${resetLink}` : null,
    "You can sign in with the temporary password. Please reset it after your first login.",
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

function formatEmailDate(value) {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value || '-';
}

export async function sendStudentScheduleChangedEmail({ to, fullName, courseName, batchName, previousStartDate, courseStartDate, courseEndDate }) {
  const safeName = escapeHtml(fullName || "Student");
  const safeCourse = escapeHtml(courseName || "-");
  const safeBatch = escapeHtml(batchName || "-");
  const displayPrevious = formatEmailDate(previousStartDate);
  const displayStart = formatEmailDate(courseStartDate);
  const displayEnd = formatEmailDate(courseEndDate);
  const safePrevious = escapeHtml(displayPrevious);
  const safeStart = escapeHtml(displayStart);
  const safeEnd = escapeHtml(displayEnd);
  const html = alertTemplate({
    eyebrow: "Course Schedule Update",
    title: "Your course dates have changed",
    subtitle: `Hello ${safeName}, your batch schedule has been updated.`,
    summary: "Please use the updated dates for your course planning and attendance.",
    details: [
      { label: "Course", value: safeCourse },
      { label: "Batch", value: safeBatch },
      { label: "Previous Start Date", value: safePrevious },
      { label: "New Start Date", value: safeStart },
      { label: "New End Date", value: safeEnd },
    ],
    primaryActionLabel: "Open Student Dashboard",
    primaryActionLink: buildLoginLink(),
    note: "This update was made by your institute. Contact the institute if you have any questions.",
  });
  return sendEmail({
    to,
    subject: "Your CISPRO course schedule has changed",
    html,
    text: [`Hello ${fullName || "Student"},`, "Your course schedule has been updated.", `Course: ${courseName || "-"}`, `Batch: ${batchName || "-"}`, `Previous start date: ${displayPrevious}`, `New start date: ${displayStart}`, `New end date: ${displayEnd}`].join("\n"),
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
  const html = alertTemplate({
    eyebrow: "Faculty Assignment",
    title: "Course Assigned",
    subtitle: `Hello ${safeName}, a course has been assigned to your faculty account.`,
    summary: "Please review your dashboard and start managing the assigned course.",
    details: [
      { label: "Faculty Name", value: safeName },
      { label: "Faculty ID", value: safeFacultyId || "-" },
      { label: "Assigned Course", value: safeCourseName || "-" },
      { label: "Login Email", value: to },
    ],
    primaryActionLabel: "Open Faculty Dashboard",
    primaryActionLink: loginLink,
    secondaryActionLabel: "Reset Password",
    secondaryActionLink: "",
    note: "Use your login credentials to continue. If this is the first login, complete the password reset from the login page.",
  });

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

export async function sendFacultyBatchAssignmentEmail({
  to,
  fullName,
  facultyId,
  courseName,
  batchId,
  batchCount = 0,
  batches = [],
}) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Faculty");
  const safeFacultyId = escapeHtml(facultyId || "");
  const safeCourseName = escapeHtml(courseName || "");
  const safeBatchId = escapeHtml(batchId || "");
  const normalizedBatches = Array.isArray(batches) ? batches : [];

  const batchSummaryLines = normalizedBatches.map((batch, index) => {
    const label = escapeHtml(batch?.batchName || `Batch ${index + 1}`);
    const timing = escapeHtml(batch?.batchTiming || "-");
    const seats = escapeHtml(String(batch?.totalSeats ?? "-"));
    const status = escapeHtml(String(batch?.status || "ACTIVE"));
    return `${label} | ${timing} | Seats: ${seats} | ${status}`;
  });

  const html = alertTemplate({
    eyebrow: "Faculty Batch Assignment",
    title: "Batches Assigned",
    subtitle: `Hello ${safeName}, batches have been assigned to your faculty account.`,
    summary: "Please review the assigned batch and manage it from your dashboard.",
    details: [
      { label: "Faculty Name", value: safeName },
      { label: "Faculty ID", value: safeFacultyId || "-" },
      { label: "Course", value: safeCourseName || "-" },
      { label: "Batch ID", value: safeBatchId || "-" },
      { label: "Batch Count", value: String(Number(batchCount || normalizedBatches.length || 0)) },
    ],
    primaryActionLabel: "Open Faculty Dashboard",
    primaryActionLink: loginLink,
    secondaryActionLabel: "",
    secondaryActionLink: "",
    note: "Use your faculty dashboard to view the assigned batches, timing, seat count, and status.",
  });

  const text = [
    `Hello ${fullName || "Faculty"},`,
    "",
    "Batches have been assigned to your faculty account.",
    facultyId ? `Faculty ID: ${facultyId}` : null,
    courseName ? `Course: ${courseName}` : null,
    batchId ? `Batch ID: ${batchId}` : null,
    `Batch Count: ${Number(batchCount || normalizedBatches.length || 0)}`,
    "",
    ...batchSummaryLines,
    "",
    loginLink ? `Faculty Dashboard: ${loginLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: `Batch Assignment - ${courseName || "Faculty"}`,
    html,
    text,
  });
}

export async function sendFacultyReplacementBatchEmail({ to, fullName, courseName, batchName, replacementDate, replacementStartTime, replacementEndTime }) {
  const formatTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(value || "-");
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const formatDate = (value) => {
    const date = new Date(`${String(value || "").trim()}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? String(value || "-") : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  const displayDate = formatDate(replacementDate);
  const displayStart = formatTime(replacementStartTime);
  const displayEnd = formatTime(replacementEndTime);
  const safeName = escapeHtml(fullName || "Faculty");
  const safeCourse = escapeHtml(courseName || "-");
  const safeBatch = escapeHtml(batchName || "-");
  const safeDate = escapeHtml(displayDate);
  const safeStart = escapeHtml(displayStart);
  const safeEnd = escapeHtml(displayEnd);
  const html = alertTemplate({ eyebrow: "Replacement Class", title: `Replacement Batch Assigned - ${safeBatch}`, subtitle: `Hi ${safeName}, a replacement batch has been assigned to you.`, summary: "Please check your Faculty Dashboard for the complete batch details.", details: [{ label: "Batch", value: safeBatch }, { label: "Course", value: safeCourse }, { label: "Date", value: safeDate }, { label: "Time", value: `${safeStart} - ${safeEnd}` }, { label: "Assignment Type", value: "Replacement Class" }], note: "Thank you." });
  const text = [`Hi ${fullName || "Faculty"},`, "", "A replacement batch has been assigned to you.", "", `Batch: ${batchName || "-"}`, `Course: ${courseName || "-"}`, `Date: ${displayDate}`, `Time: ${displayStart} - ${displayEnd}`, "Assignment Type: Replacement Class", "", "Please check your Faculty Dashboard for the complete batch details.", "", "Thank you."].join("\n");
  return sendEmail({ to, subject: `Replacement Batch Assigned - ${batchName || "Faculty"}`, html, text });
}

export async function sendFacultyCombinedClassEmail({ to, fullName, courseName, batchName, originalFacultyName, combinedDate, combinedStartTime, combinedEndTime }) {
  const formatTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(value || "-");
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const formatDate = (value) => {
    const date = new Date(`${String(value || "").trim()}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? String(value || "-") : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  const displayDate = formatDate(combinedDate);
  const displayTime = `${formatTime(combinedStartTime)} - ${formatTime(combinedEndTime)}`;
  const subject = `Combined Class Assigned - ${batchName || "Faculty"}`;
  const html = alertTemplate({
    eyebrow: "Combined Class",
    title: subject,
    subtitle: `Hi ${escapeHtml(fullName || "Faculty")}, you have been assigned this batch for a Combined Class.`,
    summary: "Please check your Faculty Dashboard for the complete class details.",
    details: [
      { label: "Course", value: escapeHtml(courseName || "-") },
      { label: "Batch", value: escapeHtml(batchName || "-") },
      { label: "Original Faculty", value: escapeHtml(originalFacultyName || "-") },
      { label: "Date", value: escapeHtml(displayDate) },
      { label: "Time", value: escapeHtml(displayTime) },
      { label: "Assignment Type", value: "Combined Class" },
    ],
  });
  const text = [`Hi ${fullName || "Faculty"},`, "", `You have been assigned the ${batchName || "batch"} class for a Combined Class on ${displayDate}, from ${displayTime}.`, "", `Course: ${courseName || "-"}`, `Batch: ${batchName || "-"}`, `Original Faculty: ${originalFacultyName || "-"}`, `Class Time: ${displayTime}`, "Assignment Type: Combined Class", "", "Please check your Faculty Dashboard for the complete class details."].join("\n");
  return sendEmail({ to, subject, html, text });
}

export async function sendStudentFacultyReassignmentEmail({ to, fullName, batchName, replacementDate, replacementStartTime, replacementEndTime }) {
  const formatTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(value || "-");
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const formatDate = (value) => {
    const date = new Date(`${String(value || "").trim()}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? String(value || "-") : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  const displayDate = formatDate(replacementDate);
  const displayStart = formatTime(replacementStartTime);
  const displayEnd = formatTime(replacementEndTime);
  const safeName = escapeHtml(fullName || "Student");
  const safeBatch = escapeHtml(batchName || "your batch");
  const safeDate = escapeHtml(displayDate);
  const safeStart = escapeHtml(displayStart);
  const safeEnd = escapeHtml(displayEnd);
  const subject = `Faculty Reassigned - ${batchName || "Your Batch"}`;
  const html = alertTemplate({
    eyebrow: "Schedule Update",
    title: subject,
    subtitle: `Hi ${safeName}, your batch has been reassigned to another faculty.`,
    summary: "Please check your Student Dashboard for the updated schedule.",
    details: [
      { label: "Batch", value: safeBatch },
      { label: "Date", value: safeDate },
      { label: "Time", value: `${safeStart} - ${safeEnd}` },
    ],
    note: "This is a temporary, session-specific faculty reassignment.",
  });
  const text = [
    `Hi ${fullName || "Student"},`,
    "",
    `Your batch ${batchName || "your batch"} has been reassigned to another faculty.`,
    "",
    `Date: ${displayDate}`,
    `Time: ${displayStart} - ${displayEnd}`,
    "",
    "Please check your Student Dashboard for the updated schedule.",
  ].join("\n");
  return sendEmail({ to, subject, html, text });
}

export async function sendFacultyLeaveApprovalEmail({ to, fullName, leaveDate, leaveType, dayType, startTime, endTime }) {
  const formatTime = (value) => {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return String(value || '-')
    const hour = Number(match[1])
    return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
  }
  const formatDate = (value) => {
    const date = new Date(`${String(value || '').trim()}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? String(value || '-') : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
  }
  const displayDate = formatDate(leaveDate)
  const displayStart = startTime ? formatTime(startTime) : '-'
  const displayEnd = endTime ? formatTime(endTime) : '-'
  const subject = `Leave Request Approved - ${displayDate}`
  const html = alertTemplate({
    eyebrow: 'Leave Management',
    title: subject,
    subtitle: `Hello ${escapeHtml(fullName || 'Faculty')}, your leave request has been approved.`,
    summary: 'Please check your Faculty Dashboard for the complete details.',
    details: [
      { label: 'Date', value: escapeHtml(displayDate) },
      { label: 'Leave Type', value: escapeHtml(leaveType || '-') },
      { label: 'Day Type', value: escapeHtml(dayType || '-') },
      ...(startTime && endTime ? [{ label: 'Time', value: `${escapeHtml(displayStart)} - ${escapeHtml(displayEnd)}` }] : []),
      { label: 'Status', value: 'Approved' },
    ],
  })
  const text = [`Hello ${fullName || 'Faculty'},`, '', `Your ${leaveType || ''} leave request has been approved.`, '', `Date: ${displayDate}`, `Leave Type: ${leaveType || '-'}`, `Day Type: ${dayType || '-'}`, startTime && endTime ? `From: ${displayStart}\nTo: ${displayEnd}` : null, 'Status: Approved', '', 'Please check your Faculty Dashboard for the complete details.'].filter(Boolean).join('\n')
  return sendEmail({ to, subject, html, text })
}

export async function sendStudentCombinedClassEmail({ to, fullName, courseName, batchName, originalFacultyName, combinedFacultyName, combinedDate, combinedStartTime, combinedEndTime }) {
  const formatTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return String(value || "-");
    const hour = Number(match[1]);
    return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
  };
  const formatDate = (value) => {
    const date = new Date(`${String(value || "").trim()}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? String(value || "-") : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  const displayDate = formatDate(combinedDate);
  const displayTime = `${formatTime(combinedStartTime)} - ${formatTime(combinedEndTime)}`;
  const subject = `Combined Class - ${batchName || "Your Batch"}`;
  const html = alertTemplate({
    eyebrow: "Schedule Update",
    title: subject,
    subtitle: `Hi ${escapeHtml(fullName || "Student")}, your class will be handled by ${escapeHtml(combinedFacultyName || "the assigned faculty")} instead of your regular faculty ${escapeHtml(originalFacultyName || "your regular faculty")}.`,
    summary: "Please check your Student Dashboard for the updated schedule.",
    details: [
      { label: "Course", value: escapeHtml(courseName || "-") },
      { label: "Batch", value: escapeHtml(batchName || "-") },
      { label: "Class Faculty", value: escapeHtml(combinedFacultyName || "-") },
      { label: "Original Faculty", value: escapeHtml(originalFacultyName || "-") },
      { label: "Date", value: escapeHtml(displayDate) },
      { label: "Time", value: escapeHtml(displayTime) },
      { label: "Assignment Type", value: "Combined Class" },
    ],
  });
  const text = [`Hi ${fullName || "Student"},`, "", `Your ${courseName || "course"} - ${batchName || "batch"} class scheduled on ${displayDate}, from ${displayTime}, will be handled by ${combinedFacultyName || "the assigned faculty"} instead of your regular faculty ${originalFacultyName || "your regular faculty"}.`, "", `Course: ${courseName || "-"}`, `Batch: ${batchName || "-"}`, `Original Faculty: ${originalFacultyName || "-"}`, `Class Faculty: ${combinedFacultyName || "-"}`, `Date: ${displayDate}`, `Time: ${displayTime}`, "Assignment Type: Combined Class", "", "Please check your Student Dashboard for the updated schedule."].join("\n");
  return sendEmail({ to, subject, html, text });
}

export async function sendStudentPaymentDueEmail({
  to,
  fullName,
  studentId,
  courseName,
  feeProgress,
  courseProgress,
  dueAmount,
  dueDate,
  installmentNumber,
}) {
  const loginLink = buildLoginLink();
  const safeName = escapeHtml(fullName || "Student");
  const safeStudentId = escapeHtml(studentId || "-");
  const safeCourseName = escapeHtml(courseName || "-");
  const safeDueDate = escapeHtml(dueDate || "-");
  const safeDueAmount = Number.isFinite(Number(dueAmount)) ? `₹${Number(dueAmount).toLocaleString("en-IN")}` : "-";

  const html = alertTemplate({
    eyebrow: "Installment Reminder",
    title: "Next Installment Due",
    subtitle: `Hello ${safeName}, your next installment is due soon.`,
    summary: "Your next installment is due within 7 days. Please complete the payment on time.",
    details: [
      { label: "Student Name", value: safeName },
      { label: "Student ID", value: safeStudentId },
      { label: "Course", value: safeCourseName },
      { label: "Pending Installment", value: installmentNumber ? `Installment ${installmentNumber}` : "-" },
      { label: "Due Amount", value: safeDueAmount },
      { label: "Due Date", value: safeDueDate },
    ],
    primaryActionLabel: "Open Student Dashboard",
    primaryActionLink: loginLink,
    secondaryActionLabel: "Reset Password",
    secondaryActionLink: "",
    note: "Please pay the due installment to avoid any delay in your course continuation.",
  });

  const text = [
    `Hello ${fullName || "Student"},`,
    "Your next installment is due within 7 days.",
    studentId ? `Student ID: ${studentId}` : null,
    courseName ? `Course: ${courseName}` : null,
    installmentNumber ? `Pending installment: ${installmentNumber}` : null,
    Number.isFinite(Number(dueAmount)) ? `Due amount: ${Number(dueAmount)}` : null,
    dueDate ? `Due date: ${dueDate}` : null,
    loginLink ? `Dashboard link: ${loginLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to,
    subject: "Next installment reminder",
    html,
    text,
  });
}

export async function sendStudentPaymentReceiptEmail({
  to,
  studentName,
  studentId,
  courseName,
  batchName,
  branchName,
  branchAddress,
  receiptNumber,
  paymentDate,
  paymentFor,
  paymentMode,
  transactionReference,
  collectedBy,
  amount,
  totalCourseFee,
  totalPaid,
  balance,
  installments,
  receiptAttachment = null,
}) {
  const html = paymentReceiptMailTemplate({
    studentName,
    paymentFor,
    receiptNumber,
    paymentDate,
    amount,
  });

  const text = [
    "CISPRO Payment Receipt",
    `Student: ${studentName || "Student"}`,
    studentId ? `Student ID: ${studentId}` : null,
    `Receipt Number: ${receiptNumber || "-"}`,
    `Payment Date: ${paymentDate || "-"}`,
    `Payment For: ${paymentFor || "-"}`,
    `Amount Received: ${amount || 0}`,
    `Remaining Balance: ${balance || 0}`,
  ].filter(Boolean).join("\n");

  const attachmentContent = String(receiptAttachment?.content || "").trim();
  const attachments = attachmentContent
    ? [{
        content: attachmentContent,
        filename: String(receiptAttachment?.filename || `Payment_Receipt_${receiptNumber || "receipt"}.pdf`),
        type: String(receiptAttachment?.contentType || "application/pdf"),
        disposition: "attachment",
      }]
    : [];

  return sendEmail({
    to,
    subject: `Payment Receipt ${receiptNumber || "-"} - CISPRO Training`,
    html,
    text,
    attachments,
  });
}
