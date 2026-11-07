import prisma from "../../config/prisma.js";
import { checkPendingHotAdmissionReminder } from "./salesAdmin.service.js";

const REMINDER_TIME_ZONE = "Asia/Kolkata";
const CHECK_INTERVAL_MS = 30 * 1000;

function isNineAm(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: REMINDER_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return parts.hour === "09" && parts.minute === "00";
}

async function runPendingHotAdmissionReminder() {
  if (!isNineAm()) return;

  const salesAdmins = await prisma.user.findMany({
    where: { role: "SALES_ADMIN", active: true },
    select: { id: true },
  });

  for (const salesAdmin of salesAdmins) {
    await checkPendingHotAdmissionReminder(salesAdmin.id);
  }
}

export function startSalesAdminAdmissionReminderScheduler() {
  const run = () => {
    void runPendingHotAdmissionReminder().catch((error) => {
      console.warn(`Pending HOT admission reminder failed: ${error?.message || error}`);
    });
  };

  run();
  const timer = setInterval(run, CHECK_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
