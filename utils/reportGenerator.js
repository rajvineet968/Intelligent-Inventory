const PDFDocument = require("pdfkit");

function generatePDF(res, title, data, columns) {
  const doc = new PDFDocument({
    margin: 40,
    size: "A4",
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${title}.pdf`
  );

  doc.pipe(res);

  /* ================= TITLE ================= */
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(title.replace(/_/g, " "), { align: "center" });

  doc.moveDown(1.5);

  /* ================= TABLE CONFIG ================= */
  const startX = 40;
  let startY = doc.y;

  // Dynamic column widths (smart defaults)
  const columnWidths = columns.map((col) => {
    if (col.toLowerCase().includes("description")) return 280;
    if (col.toLowerCase().includes("date")) return 120;
    if (col.toLowerCase().includes("amount")) return 100;
    if (col.toLowerCase().includes("status")) return 90;
    return 110;
  });

  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);

  /* ================= TABLE HEADER ================= */
  doc.font("Helvetica-Bold").fontSize(11);

  let x = startX;
  columns.forEach((col, i) => {
    doc.text(col, x, startY, {
      width: columnWidths[i],
      align: "center",
    });
    x += columnWidths[i];
  });

  startY += 20;
  doc.moveTo(startX, startY).lineTo(startX + tableWidth, startY).stroke();

  /* ================= TABLE ROWS ================= */
  doc.font("Helvetica").fontSize(10);
  startY += 8;

  data.forEach((row) => {
    // Calculate row height based on longest cell
    let rowHeight = 0;

    columns.forEach((col, i) => {
      const text = row[col] !== null && row[col] !== undefined
        ? String(row[col])
        : "-";

      const h = doc.heightOfString(text, {
        width: columnWidths[i],
      });

      rowHeight = Math.max(rowHeight, h);
    });

    x = startX;

    columns.forEach((col, i) => {
      let text = row[col];

      // Formatting
      if (col.toLowerCase().includes("amount")) {
        text = `₹ ${Number(text).toFixed(2)}`;
      } else if (col.toLowerCase().includes("date")) {
        text = new Date(text).toLocaleString();
      } else if (col.toLowerCase().includes("avg")) {
        text = `${text} units/day`;
      }

      doc.text(text ?? "-", x, startY, {
        width: columnWidths[i],
        align: "center",
      });

      x += columnWidths[i];
    });

    startY += rowHeight + 12;

    // Page break
    if (startY > 750) {
      doc.addPage();
      startY = 50;
    }
  });

  doc.end();
}

module.exports = generatePDF;
