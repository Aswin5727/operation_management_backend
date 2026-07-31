import ExcelJS from "exceljs";

const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

function addOverviewSheet(workbook, { title, generatedAt, filters = [], summary = [] }) {
  const worksheet = workbook.addWorksheet("Overview");

  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };

  worksheet.getCell("A3").value = "Generated At";
  worksheet.getCell("B3").value = generatedAt;
  worksheet.getCell("A3").font = { bold: true };

  let currentRow = 5;

  if (filters.length) {
    worksheet.getCell(`A${currentRow}`).value = "Filters";
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow += 1;

    filters.forEach((item) => {
      worksheet.getCell(`A${currentRow}`).value = item.label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = item.value;
      currentRow += 1;
    });

    currentRow += 1;
  }

  if (summary.length) {
    worksheet.getCell(`A${currentRow}`).value = "Summary";
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow += 1;

    summary.forEach((item) => {
      worksheet.getCell(`A${currentRow}`).value = item.label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = item.value;
      currentRow += 1;
    });
  }

  worksheet.columns = [
    { width: 28 },
    { width: 40 },
    { width: 20 },
    { width: 20 },
  ];
}

function addTableSheet(workbook, { name, title, columns, rows }) {
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

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const dataStartRow = 3;
  const dataEndRow = Math.max(2, worksheet.rowCount);
  styleDataRows(worksheet, dataStartRow, dataEndRow);
  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: columns.length },
  };

  fitColumns(worksheet, columns, rows);
}

async function buildExcelReport({ fileName, title, filters = [], summary = [], sheets = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CISPRO Backend";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  addOverviewSheet(workbook, {
    title,
    generatedAt: new Date().toLocaleString("en-GB", { timeZone: "Asia/Calcutta" }),
    filters,
    summary,
  });

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
