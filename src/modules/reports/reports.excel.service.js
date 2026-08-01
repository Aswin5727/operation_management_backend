import ExcelJS from "exceljs";

const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isBlankRow(row = {}, columns = []) {
  return columns.every((column) => {
    const value = row?.[column.key];
    return value === null || value === undefined || String(value).trim() === "";
  });
}

function sanitizeWorksheetName(name, fallback = "Sheet") {
  const cleaned = String(name || fallback)
    .replace(/[\\/*?:[\]]/g, " ")
    .trim()
    .slice(0, 31);

  return cleaned || fallback;
}

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  row.border = {
    top: { style: "thin", color: { argb: "FFD9E2F3" } },
    left: { style: "thin", color: { argb: "FFD9E2F3" } },
    bottom: { style: "thin", color: { argb: "FFD9E2F3" } },
    right: { style: "thin", color: { argb: "FFD9E2F3" } },
  };
}

function styleDataRows(worksheet, startRowNumber, endRowNumber) {
  for (let rowNumber = startRowNumber; rowNumber <= endRowNumber; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const hasValue = row.values
      .slice(1)
      .some((value) => value !== null && value !== undefined && String(value).trim() !== "");

    if (!hasValue) {
      row.height = 8;
      row.eachCell((cell) => {
        cell.border = {};
        cell.fill = { type: "pattern", pattern: "none" };
      });
      continue;
    }

    row.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  }
}

function fitColumns(worksheet, columns = [], rows = []) {
  columns.forEach((column, index) => {
    const values = rows.map((row) => String(row?.[column.key] ?? ""));
    const maxValueLength = Math.max(
      String(column.header || "").length,
      ...values.map((value) => value.length),
      10,
    );

    worksheet.getColumn(index + 1).width = column.width || Math.min(maxValueLength + 4, 40);
  });
}

function addGroupedBlankRows(rows = [], columns = [], groupByKey = "", spacerRowsBetweenGroups = 0) {
  if (!groupByKey || spacerRowsBetweenGroups <= 0 || !rows.length) {
    return rows;
  }

  const normalizedRows = [];

  rows.forEach((row, index) => {
    normalizedRows.push(row);

    const currentGroupValue = String(row?.[groupByKey] ?? "");
    const nextGroupValue = String(rows[index + 1]?.[groupByKey] ?? "");
    if (!rows[index + 1] || currentGroupValue === nextGroupValue) {
      return;
    }

    for (let spacerIndex = 0; spacerIndex < spacerRowsBetweenGroups; spacerIndex += 1) {
      const emptyRow = {};
      columns.forEach((column) => {
        emptyRow[column.key] = "";
      });
      normalizedRows.push(emptyRow);
    }
  });

  return normalizedRows;
}

function addTableSheet(
  workbook,
  { name, title, columns, rows, groupByKey = "", spacerRowsBetweenGroups = 0 },
) {
  const worksheet = workbook.addWorksheet(sanitizeWorksheetName(name));
  worksheet.views = [{ state: "frozen", ySplit: 2 }];

  const lastColumnLetter = worksheet.getColumn(Math.max(columns.length, 1)).letter;
  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = { size: 14, bold: true };

  worksheet.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = worksheet.getRow(2);
  headerRow.values = columns.map((column) => column.header);
  styleHeaderRow(headerRow);

  const preparedRows = addGroupedBlankRows(rows, columns, groupByKey, spacerRowsBetweenGroups);

  preparedRows.forEach((row) => {
    worksheet.addRow(row);
  });

  const dataStartRow = 3;
  const dataEndRow = Math.max(2, worksheet.rowCount);
  styleDataRows(worksheet, dataStartRow, dataEndRow);
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columns.length },
  };

  fitColumns(
    worksheet,
    columns,
    preparedRows.filter((row) => !isBlankRow(row, columns)),
  );
}

async function buildExcelReport({
  fileName,
  title,
  filters = [],
  summary = [],
  sheets = [],
  includeOverviewSheet = false,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CISPRO Backend";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  if (includeOverviewSheet) {
    const overviewWorksheet = workbook.addWorksheet("Overview");
    overviewWorksheet.mergeCells("A1:D1");
    overviewWorksheet.getCell("A1").value = title;
    overviewWorksheet.getCell("A1").font = { size: 16, bold: true };
    overviewWorksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    overviewWorksheet.getCell("A3").value = "Generated At";
    overviewWorksheet.getCell("B3").value = new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Calcutta",
    });
    overviewWorksheet.getCell("A3").font = { bold: true };

    let currentRow = 5;
    if (filters.length) {
      overviewWorksheet.getCell(`A${currentRow}`).value = "Filters";
      overviewWorksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow += 1;

      filters.forEach((item) => {
        overviewWorksheet.getCell(`A${currentRow}`).value = item.label;
        overviewWorksheet.getCell(`A${currentRow}`).font = { bold: true };
        overviewWorksheet.getCell(`B${currentRow}`).value = item.value;
        currentRow += 1;
      });

      currentRow += 1;
    }

    if (summary.length) {
      overviewWorksheet.getCell(`A${currentRow}`).value = "Summary";
      overviewWorksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
      currentRow += 1;

      summary.forEach((item) => {
        overviewWorksheet.getCell(`A${currentRow}`).value = item.label;
        overviewWorksheet.getCell(`A${currentRow}`).font = { bold: true };
        overviewWorksheet.getCell(`B${currentRow}`).value = item.value;
        currentRow += 1;
      });
    }

    overviewWorksheet.columns = [
      { width: 28 },
      { width: 40 },
      { width: 20 },
      { width: 20 },
    ];
  }

  sheets.forEach((sheet) => {
    addTableSheet(workbook, sheet);
  });

  const rawBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer);

  return {
    fileName,
    contentType: EXCEL_CONTENT_TYPE,
    buffer,
  };
}

export { EXCEL_CONTENT_TYPE, buildExcelReport };
