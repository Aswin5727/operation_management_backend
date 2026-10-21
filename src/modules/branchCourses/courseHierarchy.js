import AppError from "../../common/errors/AppError.js";
import { distributeBasisPoints } from "./courseCalculations.js";

function matchNodes(incoming, existing) {
  const used = new Set();
  return incoming.map((node) => {
    const match = existing.find((item) => item.id === node.id) ||
      existing.find((item) => item.titleKey === node.titleKey && !used.has(item.id));
    if (match && used.has(match.id)) throw new AppError("Duplicate hierarchy item", 400);
    if (match) used.add(match.id);
    return { node, match };
  });
}
async function protectSubmodules(tx, moduleId, removed) {
  if (!removed.length) return;
  const ids = removed.map((item) => item.id);
  const [attempts, work] = await Promise.all([
    tx.facultyTodayWorkStudentEntry.count({ where: { submoduleId: { in: ids } } }),
    tx.facultyTodayWorkEntry.findMany({ where: { moduleId }, select: { submoduleIds: true } }),
  ]);
  if (attempts || work.some((entry) => Array.isArray(entry.submoduleIds) && entry.submoduleIds.some((id) => ids.includes(String(id))))) {
    throw new AppError("A submodule with student work history cannot be deleted", 409);
  }
}
export async function syncCourseHierarchy(tx, branchCourseId, modules, actorId = null) {
  const existing = await tx.branchCourseModule.findMany({ where: { branchCourseId }, include: { submodules: true } });
  if (!existing.length) {
    const weights = distributeBasisPoints(modules.length);
    const created = await tx.branchCourseModule.createManyAndReturn({
      data: modules.map((node, index) => ({ branchCourseId, title: node.title, titleKey: node.titleKey,
        description: node.description, sequenceNo: index + 1, status: node.status,
        percentageBasisPoints: weights[index], createdBy: actorId, updatedBy: actorId })),
      select: { id: true, titleKey: true },
    });
    const ids = new Map(created.map((node) => [node.titleKey, node.id]));
    const children = modules.flatMap((node) => {
      const childWeights = distributeBasisPoints(node.submodules.length);
      return node.submodules.map((child, index) => ({ branchCourseModuleId: ids.get(node.titleKey),
        title: child.title, titleKey: child.titleKey, description: child.description, sequenceNo: index + 1,
        status: child.status, percentageBasisPoints: childWeights[index], createdBy: actorId, updatedBy: actorId }));
    });
    for (let i = 0; i < children.length; i += 500) await tx.branchCourseSubmodule.createMany({ data: children.slice(i, i + 500) });
    return;
  }
  const matches = matchNodes(modules, existing);
  const kept = new Set(matches.filter((item) => item.match).map((item) => item.match.id));
  const removed = existing.filter((item) => !kept.has(item.id));
  if (removed.length) {
    const ids = removed.map((item) => item.id);
    const [exams, assessments, work, attempts] = await Promise.all([
      tx.exam.count({ where: { moduleId: { in: ids } } }),
      tx.assessment.count({ where: { moduleId: { in: ids } } }),
      tx.facultyTodayWorkEntry.count({ where: { moduleId: { in: ids } } }),
      tx.facultyTodayWorkStudentEntry.count({ where: { moduleId: { in: ids } } }),
    ]);
    if (exams || assessments || work || attempts) throw new AppError("A module with exams, assessments or student work cannot be deleted", 409);
  }
  for (const { node, match } of matches) {
    if (match) {
      const childMatches = matchNodes(node.submodules, match.submodules);
      const childIds = new Set(childMatches.filter((item) => item.match).map((item) => item.match.id));
      await protectSubmodules(tx, match.id, match.submodules.filter((item) => !childIds.has(item.id)));
    }
  }
  if (removed.length) await tx.branchCourseModule.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } });
  // Park unique keys to allow renames, swaps and reordering in this transaction.
  for (const [index, item] of existing.filter((item) => kept.has(item.id)).entries()) {
    await tx.branchCourseModule.update({ where: { id: item.id }, data: { sequenceNo: -index - 1, titleKey: "__moving__" + item.id } });
  }
  const weights = distributeBasisPoints(modules.length);
  for (const [index, { node, match }] of matches.entries()) {
    const data = { branchCourseId, title: node.title, titleKey: node.titleKey, description: node.description,
      sequenceNo: index + 1, status: node.status, percentageBasisPoints: weights[index], updatedBy: actorId };
    const saved = match
      ? await tx.branchCourseModule.update({ where: { id: match.id }, data })
      : await tx.branchCourseModule.create({ data: { ...data, createdBy: actorId } });
    const children = matchNodes(node.submodules, match?.submodules || []);
    const childIds = children.filter((item) => item.match).map((item) => item.match.id);
    await tx.branchCourseSubmodule.deleteMany({ where: { branchCourseModuleId: saved.id, ...(childIds.length ? { id: { notIn: childIds } } : {}) } });
    for (const [childIndex, child] of children.filter((item) => item.match).entries()) {
      await tx.branchCourseSubmodule.update({ where: { id: child.match.id }, data: { sequenceNo: -childIndex - 1, titleKey: "__moving__" + child.match.id } });
    }
    const childWeights = distributeBasisPoints(children.length);
    for (const [childIndex, { node: child, match: old }] of children.entries()) {
      const childData = { branchCourseModuleId: saved.id, title: child.title, titleKey: child.titleKey,
        description: child.description, sequenceNo: childIndex + 1, status: child.status,
        percentageBasisPoints: childWeights[childIndex], updatedBy: actorId };
      if (old) await tx.branchCourseSubmodule.update({ where: { id: old.id }, data: childData });
      else await tx.branchCourseSubmodule.create({ data: { ...childData, createdBy: actorId } });
    }
  }
}
