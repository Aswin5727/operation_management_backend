import { baseTemplate } from "./baseTemplate.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDetailRows(details = []) {
  return (Array.isArray(details) ? details : [])
    .filter((item) => item && String(item.label || "").trim())
    .map((item) => {
      const label = escapeHtml(item.label);
      const value = escapeHtml(item.value || "-");
      return `
        <tr>
          <td style="padding:14px 16px;background:#f8fafc;color:#475569;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;width:42%;">${label}</td>
          <td style="padding:14px 16px;background:#ffffff;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #e2e8f0;">${value}</td>
        </tr>
      `;
    })
    .join("");
}

function buildButton(label, link, primary = true) {
  const safeLabel = escapeHtml(label);
  const safeLink = escapeHtml(link);

  if (!safeLink) return "";

  return `
    <a href="${safeLink}" style="
      display:inline-block;
      margin:8px 8px 0 0;
      padding:14px 24px;
      border-radius:10px;
      text-decoration:none;
      font-weight:700;
      font-size:15px;
      ${primary ? "background:#2563eb;color:#ffffff;" : "background:#eef2ff;color:#1d4ed8;border:1px solid #c7d2fe;"}
    ">${safeLabel}</a>
  `;
}

export function alertTemplate({
  eyebrow = "CISPRO Update",
  title = "Notification",
  subtitle = "",
  summary = "",
  details = [],
  primaryActionLabel = "Open Dashboard",
  primaryActionLink = "",
  secondaryActionLabel = "",
  secondaryActionLink = "",
  detailsFooter = "",
  note = "",
}) {
  const safeEyebrow = escapeHtml(eyebrow);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeSummary = escapeHtml(summary);
  const safeDetailsFooter = escapeHtml(detailsFooter);
  const safeNote = escapeHtml(note);

  const content = `
    <div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#2563eb 100%);border-radius:18px;padding:28px 30px;color:#ffffff;box-shadow:0 10px 28px rgba(37,99,235,.18);">
        <div style="font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#bfdbfe;font-weight:700;">${safeEyebrow}</div>
        <div style="margin-top:10px;font-size:28px;line-height:36px;font-weight:700;color:#ffffff !important;">${safeTitle}</div>
        ${safeSubtitle ? `<div style="margin-top:8px;font-size:14px;line-height:24px;color:#dbeafe;">${safeSubtitle}</div>` : ""}
      </div>

      ${safeSummary ? `
        <div style="margin-top:20px;padding:16px 18px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-size:14px;line-height:24px;font-weight:600;">
          ${safeSummary}
        </div>
      ` : ""}

      <div style="margin-top:22px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;border-collapse:separate;border-spacing:0;background:#ffffff;">
          ${buildDetailRows(details)}
        </table>
      </div>
      ${safeDetailsFooter ? `
        <div style="margin-top:18px;color:#475569;font-size:14px;line-height:24px;font-weight:600;">
          ${safeDetailsFooter}
        </div>
      ` : ""}

      <div style="margin-top:24px;">
        ${buildButton(primaryActionLabel, primaryActionLink, true)}
        ${buildButton(secondaryActionLabel, secondaryActionLink, false)}
      </div>

      ${safeNote ? `
        <div style="margin-top:22px;padding:15px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:12px;color:#92400e;font-size:13px;line-height:22px;">
          ${safeNote}
        </div>
      ` : ""}
    </div>
  `;

  return baseTemplate({
    title: safeTitle || safeEyebrow,
    subtitle: "",
    content,
  });
}
