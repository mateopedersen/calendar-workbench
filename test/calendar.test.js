import test from "node:test";
import assert from "node:assert/strict";
import { calendarYear, convertDate, daysInMonth, fromJdn, isLeapYear, isoWeek, monthGrid, toJdn, validateAppYear } from "../src/calendar.js";
import { calendarPdf } from "../src/pdf.js";

test("Gregorian leap-year century rules", () => {
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2100), false);
});
test("month grids include each day once and always have seven columns", () => {
  for (const [year, month] of [[2027, 1], [2027, 2], [2028, 2], [2035, 12]]) {
    for (const weekStart of ["monday", "sunday"]) {
      const grid = monthGrid(year, month, weekStart), dates = grid.weeks.flat().filter(Boolean);
      assert.ok(grid.weeks.every(week => week.length === 7));
      assert.deepEqual(dates, Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1));
    }
  }
});
test("ISO week-year handles December and January boundaries", () => {
  assert.deepEqual(isoWeek("2020-12-31"), { date: "2020-12-31", weekYear: 2020, week: 53, weekday: 4 });
  assert.deepEqual(isoWeek("2021-01-01"), { date: "2021-01-01", weekYear: 2020, week: 53, weekday: 5 });
  assert.equal(isoWeek("2027-01-04").week, 1);
});
test("strict date validation and app year bounds", () => {
  assert.throws(() => isoWeek("2027-02-29"), RangeError);
  assert.throws(() => monthGrid(2027, 13), RangeError);
  assert.throws(() => monthGrid(2027, 1, "friday"), RangeError);
  assert.throws(() => validateAppYear(2025), RangeError);
  assert.equal(validateAppYear(2035), 2035);
});
test("Julian/Gregorian conversion vectors round-trip through JDN", () => {
  assert.equal(toJdn(2000, 1, 1, "gregorian"), 2451545);
  assert.deepEqual(fromJdn(2451545, "gregorian"), { year: 2000, month: 1, day: 1 });
  assert.deepEqual(fromJdn(toJdn(1582, 10, 4, "julian"), "gregorian"), { year: 1582, month: 10, day: 14 });
  const result = convertDate(1900, 3, 1, "julian", "gregorian");
  assert.deepEqual(result.output, { year: 1900, month: 3, day: 14, calendar: "gregorian" });
});
test("year output has twelve months and explicit leap flag", () => {
  assert.equal(calendarYear(2028).months.length, 12);
  assert.equal(calendarYear(2028).leapYear, true);
});
test("PDF export is a non-empty valid PDF document", () => {
  const bytes = calendarPdf(2027, 1, "monday", "a4", false);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.includes("January 2027"));
  assert.ok(text.endsWith("%%EOF"));
});
