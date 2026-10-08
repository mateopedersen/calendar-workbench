import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarYear, convertDate, daysInMonth, isLeapYear, isoWeek, monthGrid, validateAppYear } from "./calendar.js";
import { calendarPdf } from "./pdf.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT || 8080);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
const send = (res, status, body, type = "application/json; charset=utf-8", headers = {}) => {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY", "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'", ...headers });
  res.end(body);
};
const json = (res, body, status = 200) => send(res, status, JSON.stringify(body, null, 2));
const int = (value, label) => { if (!/^\d+$/.test(value || "")) throw new RangeError(`${label} must be an integer`); return Number(value); };
const appYear = value => validateAppYear(int(value, "year"));
const dateParts = (url, yearIndex, monthIndex) => {
  const year = appYear(url.pathname.split("/")[yearIndex]);
  const month = int(url.pathname.split("/")[monthIndex], "month");
  if (month < 1 || month > 12) throw new RangeError("month must be between 1 and 12");
  return { year, month };
};
const svgCalendar = (year, month, weekStart) => {
  const grid = monthGrid(year, month, weekStart), cellW = 100, cellH = 60, width = 700, height = 130 + grid.weeks.length * cellH;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${grid.monthName} ${year} calendar</title><rect width="100%" height="100%" fill="#fff"/><text x="24" y="36" font-family="sans-serif" font-size="24" font-weight="700">${grid.monthName} ${year}</text>`;
  grid.weekdayNames.forEach((name, c) => { const x = c * cellW; svg += `<text x="${x + 9}" y="92" font-family="sans-serif" font-size="14" fill="#43546a">${name.slice(0, 3)}</text>`; });
  grid.weeks.forEach((week, r) => week.forEach((day, c) => {
    const x = c * cellW, y = 105 + r * cellH;
    svg += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="#d8dfe8"/>`;
    if (day) svg += `<text x="${x + 9}" y="${y + 20}" font-family="sans-serif" font-size="15" fill="#17263b">${day}</text>`;
  }));
  return `${svg}</svg>`;
};
const openapi = {
  openapi: "3.1.0", info: { title: "Calendar Workbench API", version: "1.0.0", description: "Deterministic proleptic Gregorian calendar calculations for years 2026–2035, plus Julian/Gregorian conversion helpers." },
  paths: {
    "/health": { get: { summary: "Readiness check", responses: { "200": { description: "Service is ready" } } } },
    "/api/v1/calendar/{year}": { get: { summary: "Get all twelve months", parameters: [{ name: "year", in: "path", required: true, schema: { type: "integer", minimum: 2026, maximum: 2035 } }, { name: "weekStart", in: "query", schema: { type: "string", enum: ["monday", "sunday"], default: "monday" } }], responses: { "200": { description: "Year calendar" }, "400": { description: "Invalid input" } } } },
    "/api/v1/calendar/{year}/{month}": { get: { summary: "Get one month grid", parameters: [{ name: "year", in: "path", required: true, schema: { type: "integer" } }, { name: "month", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 12 } }, { name: "weekStart", in: "query", schema: { type: "string", enum: ["monday", "sunday"] } }], responses: { "200": { description: "Month grid" }, "400": { description: "Invalid input" } } } },
    "/api/v1/month-grid": { get: { summary: "Get month-grid fixture", parameters: [{ name: "year", in: "query", required: true, schema: { type: "integer" } }, { name: "month", in: "query", required: true, schema: { type: "integer" } }, { name: "weekStart", in: "query", schema: { type: "string", enum: ["monday", "sunday"] } }], responses: { "200": { description: "Month grid" } } } },
    "/api/v1/iso-week": { get: { summary: "Get ISO week for a date", parameters: [{ name: "date", in: "query", required: true, schema: { type: "string", format: "date" } }], responses: { "200": { description: "ISO week number" }, "400": { description: "Invalid input" } } } },
    "/api/v1/leap-year": { get: { summary: "Check Gregorian leap year", parameters: [{ name: "year", in: "query", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Leap year result" } } } },
    "/api/v1/convert": { get: { summary: "Convert proleptic Gregorian and Julian dates", parameters: [{ name: "year", in: "query", required: true, schema: { type: "integer" } }, { name: "month", in: "query", required: true, schema: { type: "integer" } }, { name: "day", in: "query", required: true, schema: { type: "integer" } }, { name: "from", in: "query", required: true, schema: { type: "string", enum: ["gregorian", "julian"] } }, { name: "to", in: "query", required: true, schema: { type: "string", enum: ["gregorian", "julian"] } }], responses: { "200": { description: "Converted date and Julian Day Number" } } } },
    "/api/v1/print": { get: { summary: "Export a month as JSON, SVG, PDF, or printable HTML", parameters: [{ name: "year", in: "query", required: true, schema: { type: "integer" } }, { name: "month", in: "query", required: true, schema: { type: "integer" } }, { name: "format", in: "query", schema: { type: "string", enum: ["json", "svg", "pdf", "html"] } }], responses: { "200": { description: "Calendar export" } } } }
  }
};

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname === "/health") return json(res, { status: "ok", service: "calendar-workbench", version: "1.0.0" });
    if (url.pathname === "/openapi.json") return json(res, openapi);
    if (url.pathname === "/docs") return send(res, 200, await readFile(join(root, "docs.html")), "text/html; charset=utf-8");
    if (url.pathname === "/robots.txt") return send(res, 200, "User-agent: *\nAllow: /\n", "text/plain; charset=utf-8");
    if (url.pathname === "/api/v1/leap-year") { const year = int(url.searchParams.get("year"), "year"); return json(res, { year, leapYear: isLeapYear(year) }); }
    if (url.pathname === "/api/v1/iso-week") return json(res, isoWeek(url.searchParams.get("date") || ""));
    if (url.pathname === "/api/v1/month-grid") {
      const year = appYear(url.searchParams.get("year")), month = int(url.searchParams.get("month"), "month");
      return json(res, monthGrid(year, month, url.searchParams.get("weekStart") || "monday"));
    }
    if (url.pathname === "/api/v1/convert") {
      const year = int(url.searchParams.get("year"), "year"), month = int(url.searchParams.get("month"), "month"), day = int(url.searchParams.get("day"), "day");
      return json(res, convertDate(year, month, day, url.searchParams.get("from"), url.searchParams.get("to")));
    }
    if (url.pathname === "/api/v1/print") {
      const year = appYear(url.searchParams.get("year")), month = int(url.searchParams.get("month"), "month"), format = url.searchParams.get("format") || "json", weekStart = url.searchParams.get("weekStart") || "monday";
      daysInMonth(year, month);
      if (format === "json") return json(res, monthGrid(year, month, weekStart));
      if (format === "svg") return send(res, 200, svgCalendar(year, month, weekStart), "image/svg+xml; charset=utf-8", { "Content-Disposition": `attachment; filename="calendar-${year}-${String(month).padStart(2, "0")}.svg"` });
      if (format === "pdf") return send(res, 200, calendarPdf(year, month, weekStart, url.searchParams.get("paper") || "a4", url.searchParams.get("orientation") === "landscape"), "application/pdf", { "Content-Disposition": `attachment; filename="calendar-${year}-${String(month).padStart(2, "0")}.pdf"` });
      if (format === "html") return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Calendar</title><style>body{font:16px system-ui;margin:32px}table{border-collapse:collapse;width:100%;height:70vh}td,th{border:1px solid #9aa;padding:8px;vertical-align:top}button{padding:8px}@media print{button{display:none}}</style></head><body><button onclick="print()">Print / Save PDF</button><h1>${monthGrid(year, month, weekStart).monthName} ${year}</h1><table><thead><tr>${monthGrid(year, month, weekStart).weekdayNames.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${monthGrid(year, month, weekStart).weeks.map(w => `<tr>${w.map(d => `<td>${d ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`, "text/html; charset=utf-8");
      throw new RangeError("format must be json, svg, pdf, or html");
    }
    const parts = url.pathname.match(/^\/api\/v1\/calendar\/(\d{1,4})(?:\/(\d{1,2}))?\/?$/);
    if (parts) {
      const year = appYear(parts[1]), weekStart = url.searchParams.get("weekStart") || "monday";
      return json(res, parts[2] ? monthGrid(year, int(parts[2], "month"), weekStart) : calendarYear(year, weekStart));
    }
    const path = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (path.includes("..") || path.includes("\\")) return json(res, { error: "Not found" }, 404);
    try { const file = await readFile(join(root, path)); return send(res, 200, file, types[extname(path)] || "application/octet-stream"); }
    catch { return json(res, { error: "Not found", path: url.pathname }, 404); }
  } catch (error) {
    const status = error instanceof RangeError || error instanceof TypeError ? 400 : 500;
    return json(res, { error: status === 400 ? "Invalid request" : "Internal server error", message: error.message }, status);
  }
}

const server = http.createServer(handle);
server.listen(port, "0.0.0.0", () => console.log(`Calendar Workbench listening on ${port}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
