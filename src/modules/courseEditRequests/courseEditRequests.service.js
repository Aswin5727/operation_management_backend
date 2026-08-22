import prisma from "../../config/prisma.js";
import AppError from "../../common/errors/AppError.js";
import { getCurrentBranchProfile } from "../branches/branches.service.js";
import {
  buildBranchCourseHierarchyPayload,
  updateBranchCourseModulesOnly,
} from "../branchCourses/branchCourses.service.js";
import {
  createCourseEditModuleUpdatedNotification,
  createCourseEditRequestAcceptedNotification,
  createCourseEditRequestNotification,
  createCourseEditRequestRejectedNotification,
} from "../notifications/notifications.service.js";

const REQUEST_STATUSES = new Set([
  "PENDING",
  "ACCEPTED",
  "EDITING",
  "COMPLETED",
  "REJECTED",
]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function parsePage(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 10;
  return Math.min(parsed, 100);
}

function buildPagination({ page, limit }) {
  const safePage = parsePage(page);
  const safeLimit = parseLimit(limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

function buildPaginationMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function parseRequiredText(value, fieldName) {
  const text = normalizeString(value);
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  return text;
}

function parseOptionalText(value) {
  const text = normalizeString(value);
  return text ? text : null;
}

function parseStatus(value) {
  const status = normalizeString(value).toUpperCase();
  if (!REQUEST_STATUSES.has(status)) {
    throw new AppError("Invalid request status", 400);
  }
  return status;
}

function parseSortOrder(value, defaultOrder = "desc") {
  const order = normalizeString(value).toLowerCase();
  return order === "asc" || order === "desc" ? order : defaultOrder;
}

function buildRequestWhere(query = {}, branchId = null, user = {}) {
  const where = {};
  const status = normalizeString(query.status).toUpperCase();
  const search = normalizeString(query.search);
  const normalizedRole = normalizeString(user?.role).toUpperCase();

  if (status) {
    where.status = parseStatus(status);
  }

  if (branchId) {
    where.branchId = branchId;
  }

  if (normalizedRole === "FACULTY") {
    where.OR = [
      ...(normalizeEmail(user?.email)
        ? [{ facultyEmail: normalizeEmail(user.email) }]
        : []),
      ...(normalizeString(user?.id)
        ? [{ facultyUserId: normalizeString(user.id) }]
        : []),
    ];
  }

  if (search) {
    where.AND = where.AND || [];
    where.AND.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { facultyName: { contains: search, mode: "insensitive" } },
        { facultyEmail: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return where;
}

function mapHierarchySummary(modules = []) {
  return (Array.isArray(modules) ? modules : []).map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    sequenceNo: module.sequenceNo,
    status: module.status,
    submodules: Array.isArray(module.submodules)
      ? module.submodules.map((submodule) => ({
          id: submodule.id,
          title: submodule.title,
          description: submodule.description,
          sequenceNo: submodule.sequenceNo,
          status: submodule.status,
        }))
      : [],
  }));
}

function countSubmodules(modules = []) {
  return (Array.isArray(modules) ? modules : []).reduce(
    (total, module) => total + (Array.isArray(module.submodules) ? module.submodules.length : 0),
    0,
  );
}

function toRequestSummary(request, branchCourse = null) {
  if (!request) return null;

  return {
    id: request.id,
    branchCourseId: request.branchCourseId,
    branchId: request.branchId || branchCourse?.branchId || null,
    courseName: branchCourse?.name || request.branchCourseName || "",
    courseCode: branchCourse?.courseCode || "",
    facultyUserId: request.facultyUserId || null,
    facultyId: request.facultyId || "",
    facultyName: request.facultyName || "",
    facultyEmail: request.facultyEmail || "",
    title: request.title,
    reason: request.reason,
    description: request.description || "",
    status: request.status,
    responseNote: request.responseNote || "",
    requestedAt: request.createdAt,
    reviewedAt: request.reviewedAt || null,
    acceptedAt: request.acceptedAt || null,
    rejectedAt: request.rejectedAt || null,
    editingStartedAt: request.editingStartedAt || null,
    completedAt: request.completedAt || null,
    moduleCount: Array.isArray(branchCourse?.modules) ? branchCourse.modules.length : 0,
    subModuleCount: countSubmodules(branchCourse?.modules || []),
  };
}

function toRequestDetail(request, branchCourse) {
  return {
    request: toRequestSummary(request, branchCourse),
    course: branchCourse,
    requestedModules: Array.isArray(request.requestedModules)
      ? request.requestedModules
      : request.requestedModules || null,
    updatedModules: Array.isArray(request.updatedModules)
      ? request.updatedModules
      : request.updatedModules || null,
  };
}

async function resolveBranchContext(actor = {}) {
  const role = normalizeString(actor?.role).toUpperCase();

  if (role === "SUPER_ADMIN") {
    return {
      isSuperAdmin: true,
      branchProfile: null,
    };
  }

  if (role === "BRANCH_ADMIN") {
    const branchProfile = await getCurrentBranchProfile(actor);
    if (!branchProfile?.id) {
      throw new AppError("Branch profile not found", 404);
    }

    return {
      isSuperAdmin: false,
      branchProfile,
    };
  }

  return {
    isSuperAdmin: false,
    branchProfile: null,
  };
}

async function loadBranchCourse(branchCourseId, branchId = null) {
  return prisma.branchCourse.findFirst({
    where: {
      id: branchCourseId,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: {
        select: {
          id: true,
          branchId: true,
          branchName: true,
          branchAdminName: true,
          branchEmail: true,
        },
      },
      modules: {
        orderBy: {
          sequenceNo: "asc",
        },
        include: {
          submodules: {
            orderBy: {
              sequenceNo: "asc",
            },
          },
        },
      },
      branchFaculties: {
        select: {
          id: true,
          facultyId: true,
          name: true,
          email: true,
          status: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });
}

async function resolveFacultyAssignment(branchCourseId, actor = {}) {
  const normalizedEmail = normalizeEmail(actor?.email);
  const normalizedUserId = normalizeString(actor?.id);
  const normalizedUserCode = normalizeString(actor?.userCode);

  const where = {
    branchCourseId,
    ...(normalizedEmail || normalizedUserId || normalizedUserCode
      ? {
          OR: [
            ...(normalizedEmail
              ? [
                  {
                    email: {
                      equals: normalizedEmail,
                      mode: "insensitive",
                    },
                  },
                ]
              : []),
            ...(normalizedUserCode
              ? [
                  {
                    facultyId: {
                      equals: normalizedUserCode,
                      mode: "insensitive",
                    },
                  },
                ]
              : []),
            ...(normalizedUserId ? [{ facultyId: normalizedUserId }] : []),
          ],
        }
      : {}),
  };

  return prisma.branchFaculty.findFirst({
    where,
    select: {
      id: true,
      facultyId: true,
      name: true,
      email: true,
      branchId: true,
      branchCourseId: true,
      courseId: true,
      status: true,
    },
  });
}

async function resolveFacultyUser(facultyEmail, facultyId = null) {
  return prisma.user.findFirst({
    where: {
      role: "FACULTY",
      OR: [
        ...(facultyEmail
          ? [
              {
                email: {
                  equals: facultyEmail,
                  mode: "insensitive",
                },
              },
            ]
          : []),
        ...(facultyId ? [{ id: facultyId }] : []),
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });
}

async function syncRequestNotification(tx, request, updates = {}) {
  if (!request?.id) {
    return;
  }

  await tx.notification.updateMany({
    where: {
      requestId: request.id,
      kind: "COURSE_EDIT_REQUEST",
    },
    data: updates,
  });
}

function findHierarchyChange(beforeModules = [], afterModules = []) {
  const before = Array.isArray(beforeModules) ? beforeModules : [];
  const after = Array.isArray(afterModules) ? afterModules : [];

  for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
    const beforeModule = before[index];
    const afterModule = after[index];

    if (!beforeModule && afterModule) {
      return {
        module: afterModule,
        subModule: afterModule.submodules?.[0] || null,
        updatedFields: ["module added"],
      };
    }

    if (beforeModule && !afterModule) {
      return {
        module: beforeModule,
        subModule: beforeModule.submodules?.[0] || null,
        updatedFields: ["module removed"],
      };
    }

    if (!beforeModule || !afterModule) {
      continue;
    }

    const moduleFieldChanges = [];
    if (beforeModule.title !== afterModule.title) moduleFieldChanges.push("module title");
    if (beforeModule.description !== afterModule.description) moduleFieldChanges.push("module description");
    if (beforeModule.sequenceNo !== afterModule.sequenceNo) moduleFieldChanges.push("module order");
    if (beforeModule.status !== afterModule.status) moduleFieldChanges.push("module status");

    const beforeSubmodules = Array.isArray(beforeModule.submodules) ? beforeModule.submodules : [];
    const afterSubmodules = Array.isArray(afterModule.submodules) ? afterModule.submodules : [];

    for (let subIndex = 0; subIndex < Math.max(beforeSubmodules.length, afterSubmodules.length); subIndex += 1) {
      const beforeSubmodule = beforeSubmodules[subIndex];
      const afterSubmodule = afterSubmodules[subIndex];

      if (!beforeSubmodule && afterSubmodule) {
        return {
          module: afterModule,
          subModule: afterSubmodule,
          updatedFields: [...moduleFieldChanges, "sub-module added"],
        };
      }

      if (beforeSubmodule && !afterSubmodule) {
        return {
          module: afterModule,
          subModule: beforeSubmodule,
          updatedFields: [...moduleFieldChanges, "sub-module removed"],
        };
      }

      if (!beforeSubmodule || !afterSubmodule) {
        continue;
      }

      const submoduleFieldChanges = [];
      if (beforeSubmodule.title !== afterSubmodule.title) submoduleFieldChanges.push("sub-module title");
      if (beforeSubmodule.description !== afterSubmodule.description) submoduleFieldChanges.push("sub-module description");
      if (beforeSubmodule.sequenceNo !== afterSubmodule.sequenceNo) submoduleFieldChanges.push("sub-module order");
      if (beforeSubmodule.status !== afterSubmodule.status) submoduleFieldChanges.push("sub-module status");

      if (submoduleFieldChanges.length || moduleFieldChanges.length) {
        return {
          module: afterModule,
          subModule: afterSubmodule,
          updatedFields: [...moduleFieldChanges, ...submoduleFieldChanges],
        };
      }
    }

    if (moduleFieldChanges.length) {
      return {
        module: afterModule,
        subModule: afterModule.submodules?.[0] || null,
        updatedFields: moduleFieldChanges,
      };
    }
  }

  return {
    module: after[0] || before[0] || null,
    subModule: (after[0]?.submodules || before[0]?.submodules || [])[0] || null,
    updatedFields: [],
  };
}

export async function createCourseEditRequest(actor, payload = {}) {
  if (normalizeString(actor?.role).toUpperCase() !== "FACULTY") {
    throw new AppError("Only faculty can create an edit request", 403);
  }

  const branchCourseId = parseRequiredText(payload.branchCourseId, "Course");
  const title = parseRequiredText(payload.title || payload.requestTitle, "Request title");
  const reason = parseRequiredText(payload.reason || payload.requestReason, "Request reason");
  const description = parseOptionalText(payload.description || payload.requestDescription);

  const branchCourse = await loadBranchCourse(branchCourseId);
  if (!branchCourse) {
    throw new AppError("Course not found", 404);
  }

  const branchFaculty = await resolveFacultyAssignment(branchCourseId, actor);
  if (!branchFaculty) {
    throw new AppError("You are not assigned to this course", 403);
  }

  const facultyUser = await resolveFacultyUser(branchFaculty.email, actor.id);
  const actorId = normalizeString(actor?.id) || null;

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.courseEditRequest.create({
      data: {
        branchCourseId,
        branchId: branchCourse.branchId,
        facultyUserId: facultyUser?.id || actorId || null,
        facultyId: branchFaculty.facultyId || actorId || null,
        facultyName: branchFaculty.name || actor.fullName || facultyUser?.fullName || "",
        facultyEmail: normalizeEmail(branchFaculty.email || actor.email),
        title,
        reason,
        description,
        status: "PENDING",
        requestedModules: mapHierarchySummary(branchCourse.modules || []),
        createdBy: actorId,
        updatedBy: actorId,
      },
    });

    await createCourseEditRequestNotification({
      request: created,
      branchCourse,
      faculty: {
        facultyId: branchFaculty.facultyId || actorId || null,
        facultyName: branchFaculty.name || actor.fullName || facultyUser?.fullName || "",
        userId: facultyUser?.id || actorId || null,
      },
      actor,
      prismaClient: tx,
    });

    return created;
  });

  return {
    request: toRequestSummary(request, branchCourse),
    course: branchCourse,
  };
}

export async function listCourseEditRequests(query = {}, actor = {}) {
  const { page, limit, skip, take } = buildPagination(query);
  const { branchProfile, isSuperAdmin } = await resolveBranchContext(actor);
  const where = buildRequestWhere(query, isSuperAdmin ? null : branchProfile?.id || null, actor);
  const sortBy = normalizeString(query.sortBy).toLowerCase() || "createdat";
  const sortOrder = parseSortOrder(query.sortOrder, "desc");

  const orderBy = (() => {
    switch (sortBy) {
      case "status":
        return { status: sortOrder };
      case "reviewedat":
        return { reviewedAt: sortOrder };
      case "completedat":
        return { completedAt: sortOrder };
      case "facultyname":
        return { facultyName: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  })();

  const [total, rows] = await prisma.$transaction([
    prisma.courseEditRequest.count({ where }),
    prisma.courseEditRequest.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
  ]);

  const branchCourseIds = [...new Set(rows.map((row) => row.branchCourseId).filter(Boolean))];
  const courses = branchCourseIds.length
    ? await prisma.branchCourse.findMany({
        where: {
          id: {
            in: branchCourseIds,
          },
        },
        include: {
          modules: {
            orderBy: { sequenceNo: "asc" },
            include: {
              submodules: {
                orderBy: { sequenceNo: "asc" },
              },
            },
          },
        },
      })
    : [];

  const courseMap = new Map(courses.map((course) => [course.id, course]));

  return {
    data: rows.map((request) => toRequestSummary(request, courseMap.get(request.branchCourseId) || null)),
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getCourseEditRequest(requestId, actor = {}) {
  const normalizedRequestId = parseRequiredText(requestId, "Request ID");
  const { branchProfile, isSuperAdmin } = await resolveBranchContext(actor);
  const normalizedRole = normalizeString(actor?.role).toUpperCase();
  const normalizedEmail = normalizeEmail(actor?.email);
  const normalizedUserId = normalizeString(actor?.id);

  const request = await prisma.courseEditRequest.findFirst({
    where: {
      id: normalizedRequestId,
      ...(isSuperAdmin ? {} : branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!request) {
    throw new AppError("Edit request not found", 404);
  }

  if (normalizedRole === "FACULTY") {
    const ownsByEmail = normalizedEmail && normalizeEmail(request.facultyEmail) === normalizedEmail;
    const ownsByUser = normalizedUserId && request.facultyUserId === normalizedUserId;

    if (!ownsByEmail && !ownsByUser) {
      throw new AppError("Edit request not found", 404);
    }
  }

  const course = await loadBranchCourse(request.branchCourseId, isSuperAdmin ? null : branchProfile?.id || null);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return toRequestDetail(request, course);
}

export async function acceptCourseEditRequest(requestId, payload = {}, actor = {}) {
  const normalizedRequestId = parseRequiredText(requestId, "Request ID");
  const responseNote = parseOptionalText(payload.responseNote || payload.note);
  const { branchProfile, isSuperAdmin } = await resolveBranchContext(actor);

  const request = await prisma.courseEditRequest.findFirst({
    where: {
      id: normalizedRequestId,
      ...(isSuperAdmin ? {} : branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!request) {
    throw new AppError("Edit request not found", 404);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Only pending requests can be accepted", 400);
  }

  const course = await loadBranchCourse(request.branchCourseId, request.branchId || branchProfile?.id || null);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const facultyUser = request.facultyUserId
    ? await prisma.user.findUnique({
        where: {
          id: request.facultyUserId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      })
    : await resolveFacultyUser(request.facultyEmail, request.facultyUserId);

  const actorId = normalizeString(actor?.id) || null;
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.courseEditRequest.update({
      where: { id: request.id },
      data: {
        status: "ACCEPTED",
        reviewedByUserId: actorId,
        reviewedAt: now,
        acceptedAt: now,
        responseNote,
        updatedBy: actorId,
      },
    });

    await syncRequestNotification(tx, record, {
      requestStatus: "ACCEPTED",
      tone: "green",
      title: "Edit Request Approved",
      message: `You can now edit the Modules and Sub Modules of ${course.name || "the course"}.`,
      actionLabel: "Accepted",
    });

    await createCourseEditRequestAcceptedNotification({
      request: record,
      branchCourse: course,
      faculty: {
        userId: facultyUser?.id || request.facultyUserId || null,
        facultyId: request.facultyId || facultyUser?.id || null,
        facultyName: request.facultyName || facultyUser?.fullName || "",
      },
      actor,
      prismaClient: tx,
    });

    return record;
  });

  return toRequestSummary(updated, course);
}

export async function rejectCourseEditRequest(requestId, payload = {}, actor = {}) {
  const normalizedRequestId = parseRequiredText(requestId, "Request ID");
  const responseNote = parseRequiredText(payload.responseNote || payload.note || "Request rejected", "Response note");
  const { branchProfile, isSuperAdmin } = await resolveBranchContext(actor);

  const request = await prisma.courseEditRequest.findFirst({
    where: {
      id: normalizedRequestId,
      ...(isSuperAdmin ? {} : branchProfile?.id ? { branchId: branchProfile.id } : {}),
    },
  });

  if (!request) {
    throw new AppError("Edit request not found", 404);
  }

  if (request.status !== "PENDING") {
    throw new AppError("Only pending requests can be rejected", 400);
  }

  const course = await loadBranchCourse(request.branchCourseId, request.branchId || branchProfile?.id || null);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const facultyUser = request.facultyUserId
    ? await prisma.user.findUnique({
        where: {
          id: request.facultyUserId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      })
    : await resolveFacultyUser(request.facultyEmail, request.facultyUserId);

  const actorId = normalizeString(actor?.id) || null;
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.courseEditRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedByUserId: actorId,
        reviewedAt: now,
        rejectedAt: now,
        responseNote,
        updatedBy: actorId,
      },
    });

    await syncRequestNotification(tx, record, {
      requestStatus: "REJECTED",
      tone: "red",
      title: "Edit Request Rejected",
      message: responseNote,
      actionLabel: "Rejected",
    });

    await createCourseEditRequestRejectedNotification({
      request: record,
      branchCourse: course,
      faculty: {
        userId: facultyUser?.id || request.facultyUserId || null,
        facultyId: request.facultyId || facultyUser?.id || null,
        facultyName: request.facultyName || facultyUser?.fullName || "",
      },
      actor,
      responseNote,
      prismaClient: tx,
    });

    return record;
  });

  return toRequestSummary(updated, course);
}

export async function saveCourseEditRequestModules(requestId, payload = {}, actor = {}) {
  const normalizedRequestId = parseRequiredText(requestId, "Request ID");
  const hierarchy = buildBranchCourseHierarchyPayload(payload);
  if (!hierarchy) {
    throw new AppError("Modules are required", 400);
  }

  if (normalizeString(actor?.role).toUpperCase() !== "FACULTY") {
    throw new AppError("Only faculty can save course edits", 403);
  }

  const request = await prisma.courseEditRequest.findFirst({
    where: {
      id: normalizedRequestId,
    },
  });

  if (!request) {
    throw new AppError("Edit request not found", 404);
  }

  const facultyUser = await resolveFacultyUser(request.facultyEmail, request.facultyUserId);
  if (facultyUser?.id && facultyUser.id !== actor.id) {
    throw new AppError("You are not allowed to edit this request", 403);
  }

  if (normalizeEmail(request.facultyEmail) && normalizeEmail(actor.email) !== normalizeEmail(request.facultyEmail)) {
    throw new AppError("You are not allowed to edit this request", 403);
  }

  if (!["ACCEPTED", "EDITING"].includes(request.status)) {
    throw new AppError("Request must be accepted before saving changes", 400);
  }

  const course = await loadBranchCourse(request.branchCourseId, request.branchId || null);
  if (!course) {
    throw new AppError("Course not found", 404);
  }

  const beforeModules = mapHierarchySummary(course.modules || []);
  const afterModules = mapHierarchySummary(hierarchy);
  const changeSummary = findHierarchyChange(beforeModules, afterModules);
  const actorId = normalizeString(actor?.id) || null;
  const now = new Date();

  const updatedCourse = await updateBranchCourseModulesOnly(
    request.branchCourseId,
    payload,
    actor,
    {
      branchId: request.branchId || course.branchId || null,
    },
  );

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const record = await tx.courseEditRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        editingStartedAt: request.editingStartedAt || now,
        completedAt: now,
        reviewedAt: request.reviewedAt || now,
        updatedModules: afterModules,
        updatedBy: actorId,
      },
    });

    await syncRequestNotification(tx, record, {
      requestStatus: "COMPLETED",
      tone: "blue",
      title: "Course Module Updated",
      message: `Faculty updated modules and sub-modules for ${course.name || "the course"}.`,
      actionLabel: "Updated",
    });

    await createCourseEditModuleUpdatedNotification({
      request: record,
      branchCourse: updatedCourse,
      faculty: {
        facultyId: request.facultyId || facultyUser?.id || null,
        facultyName: request.facultyName || facultyUser?.fullName || "",
      },
      module: changeSummary.module || {},
      subModule: changeSummary.subModule || {},
      actor,
      updatedFields: changeSummary.updatedFields || [],
      prismaClient: tx,
    });

    return record;
  });

  return {
    request: toRequestSummary(updatedRequest, updatedCourse),
    course: updatedCourse,
  };
}
