import ExcelJS from "exceljs";
import { generateBranchMonthlyReport as generateBaseBranchMonthlyReport } from "./branchMonthlyReport.service.js";

const CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const STATUS_LEGEND = [
  ["Completed Student", "FFC6EFCE"],
  ["Currently Studying / In Progress", "FFBDD7EE"],
  ["Discontinued Student", "FFFFC7CE"],
  ["New Student", "FFFCE4D6"],
];

function toNumber(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function formatAmount(value) {
  return value > 0 ? value : 0;
}

function findColumnIndexes(sheet) {
  const indexes = { paidAmount: [], pendingAmount: [], totalFees: [] };
  const headerRows = [6, 7, 4, 5];

  headerRows.forEach((rowNumber) => {
    sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
      const value = String(cell.value ?? "").trim().toLowerCase();
      if (value === "paid amount" && !indexes.paidAmount.includes(columnNumber)) indexes.paidAmount.push(columnNumber);
      if (value === "pending amount" && !indexes.pendingAmount.includes(columnNumber)) indexes.pendingAmount.push(columnNumber);
      if (value === "total fees" && !indexes.totalFees.includes(columnNumber)) indexes.totalFees.push(columnNumber);
    });
  });

  return indexes;
}

function addCollectionSummary(sheet, previousCollection = 0) {
  const indexes = findColumnIndexes(sheet);
  const firstDataRow = 8;
  let actual = 0;
  let expected = 0;

  for (let rowNumber = firstDataRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    indexes.paidAmount.forEach((columnNumber) => { actual += toNumber(row.getCell(columnNumber).value); });
    indexes.pendingAmount.forEach((columnNumber) => { expected += toNumber(row.getCell(columnNumber).value); });
  }

  const border = {
    top: { style: "thin", color: { argb: "FFD6E4F0" } },
    bottom: { style: "thin", color: { argb: "FFD6E4F0" } },
    left: { style: "thin", color: { argb: "FFD6E4F0" } },
    right: { style: "thin", color: { argb: "FFD6E4F0" } },
  };
  const headerRow = sheet.getRow(3);
  const valueRow = sheet.getRow(4);
  ["Expected", "Actual", "Previous Collection"].forEach((label, index) => {
    const headerCell = headerRow.getCell(index + 1);
    const valueCell = valueRow.getCell(index + 1);
    headerCell.value = label;
    valueCell.value = formatAmount(index === 0 ? expected : index === 1 ? actual : previousCollection);
    headerCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    valueCell.font = { bold: true, color: { argb: "FF17345F" }, size: 12 };
    headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index === 0 ? "FFEAF3FA" : index === 1 ? "FFE2F0D9" : "FFFFF1D6" } };
    headerCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    valueCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    headerCell.border = border;
    valueCell.border = border;
    sheet.getColumn(index + 1).width = Math.max(sheet.getColumn(index + 1).width || 10, 16);
  });

  headerRow.height = 24;
  valueRow.height = 26;
  sheet.getRow(5).height = 12;
}
function addStatusLegend(sheet) {
  const startRow = sheet.rowCount + 2;
  const title = sheet.getCell(startRow, 1);
  title.value = "Status Colour Legend";
  title.font = { bold: true, color: { argb: "FF1F4E78" } };

  STATUS_LEGEND.forEach(([label, color], index) => {
    const cell = sheet.getCell(startRow + index + 1, 1);
    cell.value = label;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.font = { color: { argb: "FF17345F" } };
    cell.alignment = { vertical: "middle" };
  });
}

export async function generateBranchMonthlyReport(query, user) {
  const report = await generateBaseBranchMonthlyReport(query, user);
  const includeCollectionSummary = String(query.includeCollectionSummary ?? "").toLowerCase() === "true";
  const includeStatusLegend = String(query.includeStatusLegend ?? "").toLowerCase() === "true";

  // Monthly Collection Report has the reference workbook's summary and legend.
  // Student Status Report intentionally keeps the base export unchanged.
  if (!includeCollectionSummary && !includeStatusLegend) return report;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(report.buffer);

  const sheet = workbook.worksheets[0];
  if (includeCollectionSummary) {
    sheet.getCell(1, 1).value = "Branch Admin Monthly Collection Report";
    const metadataCell = sheet.getCell(2, 1);
    metadataCell.value = String(metadataCell.value || "") + " | Total Students: " + String(report.totalStudents ?? 0);
    addCollectionSummary(sheet, report.previousCollection);
  }
  if (includeStatusLegend) addStatusLegend(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ...report,
    contentType: CONTENT_TYPE,
    buffer: Buffer.from(buffer),
  };
}

