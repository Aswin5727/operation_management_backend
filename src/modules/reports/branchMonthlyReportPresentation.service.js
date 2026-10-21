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

  sheet.getRow(4).eachCell((cell, columnNumber) => {
    const value = String(cell.value ?? "").trim().toLowerCase();
    if (value === "paid amount") indexes.paidAmount.push(columnNumber);
    if (value === "pending amount") indexes.pendingAmount.push(columnNumber);
    if (value === "total fees") indexes.totalFees.push(columnNumber);
  });

  if (!indexes.paidAmount.length || !indexes.pendingAmount.length) {
    sheet.getRow(5).eachCell((cell, columnNumber) => {
      const value = String(cell.value ?? "").trim().toLowerCase();
      if (value === "paid amount" && !indexes.paidAmount.length) indexes.paidAmount.push(columnNumber);
      if (value === "pending amount" && !indexes.pendingAmount.length) indexes.pendingAmount.push(columnNumber);
    });
  }

  return indexes;
}

function addCollectionSummary(sheet) {
  const indexes = findColumnIndexes(sheet);
  const firstDataRow = 6;
  let actual = 0;
  let expected = 0;

  for (let rowNumber = firstDataRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    indexes.paidAmount.forEach((columnNumber) => { actual += toNumber(row.getCell(columnNumber).value); });
    indexes.pendingAmount.forEach((columnNumber) => { expected += toNumber(row.getCell(columnNumber).value); });
  }

  const summary = [
    ["Expected Collection", formatAmount(expected)],
    ["Actual Collection", formatAmount(actual)],
    ["Previous Month Collection", 0],
  ];

  const row = sheet.getRow(3);
  summary.forEach(([label, value], index) => {
    const labelCell = row.getCell(index * 2 + 1);
    const valueCell = row.getCell(index * 2 + 2);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { bold: true, color: { argb: "FF1F4E78" } };
    valueCell.font = { bold: true, color: { argb: "FF17345F" } };
    labelCell.alignment = { vertical: "middle" };
    valueCell.alignment = { vertical: "middle" };
  });

  row.height = 22;
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
    addCollectionSummary(sheet);
  }
  if (includeStatusLegend) addStatusLegend(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ...report,
    contentType: CONTENT_TYPE,
    buffer: Buffer.from(buffer),
  };
}

