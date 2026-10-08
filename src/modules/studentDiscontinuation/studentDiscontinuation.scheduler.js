import prisma from "../../config/prisma.js";
import { createNotification } from "../notifications/notifications.service.js";
import { sendStudentContinuationReminderEmail } from "../../common/services/resendEmail.js";

const SWEEP_INTERVAL_MS = Math.max(Number(process.env.DISCONTINUATION_FOLLOW_UP_SWEEP_INTERVAL_MS || 60000), 30000);

function dateText(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Calcutta" }).format(date);
}

export async function runDiscontinuationFollowUpSweep(today = dateText()) {
  const requests = await prisma.studentDiscontinuationRequest.findMany({
    where: {
      status: "UNABLE_TO_CONTACT",
      nextFollowUpDate: { lte: today },
    },
    include: {
      branchStudent: {
        select: { studentName: true, studentId: true, courseName: true, batchName: true },
      },
    },
  });

  let notified = 0;
  for (const request of requests) {
    const branch = await prisma.branch.findUnique({
      where: { id: request.branchId },
      select: { id: true, branchName: true, branchEmail: true, adminUserId: true },
    });
    if (!branch?.adminUserId) continue;

    const requestDescription = `DISCONTINUATION_FOLLOW_UP:${request.id}:${request.nextFollowUpDate}`;
    const existing = await prisma.notification.findFirst({
      where: {
        kind: "STUDENT_DISCONTINUATION",
        targetUserId: branch.adminUserId,
        requestDescription,
      },
      select: { id: true },
    });
    if (existing) continue;

    await createNotification({
      kind: "STUDENT_DISCONTINUATION",
      tone: "amber",
      title: "Discontinuation follow-up due",
      message: `Follow up with ${request.branchStudent?.studentName || "the student"} today. The previous call could not be completed.`,
      actionLabel: "Open Discontinuation",
      targetUserId: branch.adminUserId,
      targetBranchId: branch.id,
      targetBranchEmail: branch.branchEmail,
      targetBranchName: branch.branchName,
      requestDescription,
      requestTitle: "Discontinuation follow-up",
      requestStatus: request.status,
      createdBy: "SYSTEM",
    });
    notified += 1;
  }

  return { scanned: requests.length, notified };
}

export async function runMotivationContinuationSweep(today = dateText()) {
  const requests = await prisma.studentDiscontinuationRequest.findMany({
    where: {
      reason: "Long absence follow-up after motivation email",
      status: "CONTACTED_CONTINUE",
      nextFollowUpDate: { lte: today },
    },
    include: {
      branchStudent: {
        select: {
          id: true,
          studentId: true,
          studentName: true,
          emailAddress: true,
          courseName: true,
        },
      },
    },
  });

  let sent = 0;
  for (const request of requests) {
    const requestDescription = "MOTIVATION_CONTINUE_DATE:" + request.id + ":" + request.nextFollowUpDate;
    const existing = await prisma.notification.findFirst({
      where: { requestDescription },
      select: { id: true },
    });
    if (existing) continue;

    try {
      await sendStudentContinuationReminderEmail({
        to: request.branchStudent?.emailAddress,
        fullName: request.branchStudent?.studentName,
        studentId: request.branchStudent?.studentId,
        courseName: request.branchStudent?.courseName,
        continuationDate: request.nextFollowUpDate,
      });
      const studentUser = await prisma.user.findFirst({
        where: {
          role: "STUDENT",
          email: { equals: request.branchStudent?.emailAddress || "", mode: "insensitive" },
        },
        select: { id: true },
      });
      if (studentUser?.id) {
        await createNotification({
          kind: "STUDENT_DISCONTINUATION",
          tone: "green",
          title: "Course continuation date reached",
          message: "Your course continuation date is " + request.nextFollowUpDate + ". Please attend your class and contact the branch if you need support.",
          actionLabel: "View request",
          targetUserId: studentUser.id,
          requestDescription,
          requestTitle: "Course continuation reminder",
          requestStatus: request.status,
          createdBy: "SYSTEM",
        });
      }
      sent += 1;
    } catch (error) {
      console.warn("Continuation reminder failed for " + request.branchStudentId + ":", error?.message || error);
    }
  }

  return { scanned: requests.length, sent };
}
export async function runDiscontinuationAccessDeactivationSweep(now = new Date()) {
  const requests = await prisma.studentDiscontinuationRequest.findMany({
    where: {
      status: "APPROVED",
      accessDeactivationAt: { lte: now },
      branchStudent: { recordStatus: "ACTIVE" },
    },
    select: { id: true, branchStudentId: true, branchStudent: { select: { emailAddress: true } } },
  });

  let deactivated = 0;
  for (const request of requests) {
    await prisma.$transaction(async (tx) => {
      const studentUpdate = await tx.branchStudent.updateMany({
        where: { id: request.branchStudentId, recordStatus: "ACTIVE" },
        data: { recordStatus: "INACTIVE" },
      });
      if (!studentUpdate.count) return;
      await tx.user.updateMany({
        where: { email: { equals: request.branchStudent.emailAddress, mode: "insensitive" }, role: "STUDENT", active: true },
        data: { active: false, refreshTokenVersion: { increment: 1 } },
      });
      deactivated += 1;
    });
  }

  return { scanned: requests.length, deactivated };
}

export function startDiscontinuationFollowUpScheduler() {
  const runSweep = () => {
    void (async () => {
      await runDiscontinuationFollowUpSweep();
      await runMotivationContinuationSweep();
      await runDiscontinuationAccessDeactivationSweep();
    })().catch((error) => {
      console.warn("Discontinuation scheduler sweep failed", error);
    });
  };
  runSweep();
  const timer = setInterval(runSweep, SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}