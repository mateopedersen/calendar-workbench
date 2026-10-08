import { monthGrid } from "./calendar.js";

const esc = s => String(s).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
export function calendarPdf(year, month, weekStart = "monday", paper = "a4", landscape = false) {
  const grid = monthGrid(year, month, weekStart);
  const width = paper === "letter" ? 612 : 595.28;
  const height = paper === "letter" ? 792 : 841.89;
  const pageW = landscape ? height : width;
  const pageH = landscape ? width : height;
  const margin = 38, top = pageH - 60, gridW = pageW - 2 * margin, cellW = gridW / 7;
  const cellH = Math.min(82, (pageH - 160) / grid.weeks.length);
  const out = ["BT", "/F1 22 Tf", `${margin} ${top} Td`, `(${esc(`${grid.monthName} ${year}`)}) Tj`, "ET"];
  out.push("0.18 0.24 0.32 RG 1 w");
  const headerY = top - 38;
  for (let i = 0; i <= 7; i++) out.push(`${margin + i * cellW} ${headerY} m ${margin + i * cellW} ${headerY - cellH * (grid.weeks.length + 1)} l S`);
  for (let i = 0; i <= grid.weeks.length + 1; i++) { const y = headerY - i * cellH; out.push(`${margin} ${y} m ${margin + gridW} ${y} l S`); }
  const short = grid.weekdayNames.map(d => d.slice(0, 3));
  for (let i = 0; i < 7; i++) out.push(`BT /F1 10 Tf ${margin + i * cellW + 6} ${headerY - 21} Td (${short[i]}) Tj ET`);
  grid.weeks.forEach((week, r) => week.forEach((day, c) => {
    if (day) out.push(`BT /F1 12 Tf ${margin + c * cellW + 7} ${headerY - (r + 1) * cellH + cellH - 19} Td (${day}) Tj ET`);
  }));
  const content = out.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n", offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
