export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function isLeapYear(year) {
  return Number.isInteger(year) && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("year and month must be valid integers");
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

// Proleptic Gregorian weekday, Monday=0. Uses integer arithmetic, not local time.
export function weekday(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return (date.getUTCDay() + 6) % 7;
}

export function monthGrid(year, month, weekStart = "monday") {
  const length = daysInMonth(year, month);
  if (weekStart !== "monday" && weekStart !== "sunday") throw new RangeError("weekStart must be monday or sunday");
  const offset = (weekday(year, month, 1) - (weekStart === "monday" ? 0 : 6) + 7) % 7;
  const count = Math.ceil((offset + length) / 7) * 7;
  const weeks = [];
  for (let i = 0; i < count; i += 7) {
    const row = [];
    for (let j = 0; j < 7; j++) {
      const day = i + j - offset + 1;
      row.push(day > 0 && day <= length ? day : null);
    }
    weeks.push(row);
  }
  const weekdayNames = weekStart === "monday" ? WEEKDAYS : [...WEEKDAYS.slice(6), ...WEEKDAYS.slice(0, 6)];
  return { year, month, monthName: MONTHS[month - 1], weekStart, weekdayNames, weeks };
}

export function isoWeek(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new RangeError("date must use YYYY-MM-DD");
  const [year, month, day] = dateString.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new RangeError("date is not a valid Gregorian date");
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(0, 0, 0, 0);
  const isoDay = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - isoDay);
  const weekYear = d.getUTCFullYear();
  const yearStart = new Date(0);
  yearStart.setUTCFullYear(weekYear, 0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);
  return { date: dateString, weekYear, week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), weekday: isoDay };
}

export function calendarYear(year, weekStart = "monday") {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError("year must be between 1 and 9999");
  return { year, leapYear: isLeapYear(year), months: MONTHS.map((_, index) => monthGrid(year, index + 1, weekStart)) };
}

export function validateAppYear(year) {
  if (!Number.isInteger(year) || year < 2026 || year > 2035) throw new RangeError("year must be between 2026 and 2035");
  return year;
}

// Integer Julian Day Number at noon, for a date in the selected proleptic calendar.
export function toJdn(year, month, day, calendar = "gregorian") {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day)) throw new RangeError("invalid date");
  const leap = calendar === "julian" ? year % 4 === 0 : isLeapYear(year);
  const maxDay = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day < 1 || day > maxDay || !["julian", "gregorian"].includes(calendar)) throw new RangeError("invalid date or calendar");
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const common = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
  return calendar === "gregorian"
    ? common - Math.floor(y / 100) + Math.floor(y / 400) - 32045
    : common - 32083;
}

export function fromJdn(jdn, calendar = "gregorian") {
  if (!Number.isInteger(jdn) || !["julian", "gregorian"].includes(calendar)) throw new RangeError("jdn must be an integer and calendar must be julian or gregorian");
  let year, month, day;
  if (calendar === "gregorian") {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    day = e - Math.floor((153 * m + 2) / 5) + 1;
    month = m + 3 - 12 * Math.floor(m / 10);
    year = 100 * b + d - 4800 + Math.floor(m / 10);
  } else {
    const c = jdn + 32082;
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor(1461 * d / 4);
    const m = Math.floor((5 * e + 2) / 153);
    day = e - Math.floor((153 * m + 2) / 5) + 1;
    month = m + 3 - 12 * Math.floor(m / 10);
    year = d - 4800 + Math.floor(m / 10);
  }
  return { year, month, day };
}

export function convertDate(year, month, day, from, to) {
  return { input: { year, month, day, calendar: from }, output: { ...fromJdn(toJdn(year, month, day, from), to), calendar: to }, jdn: toJdn(year, month, day, from), assumption: "Proleptic calendars; no regional adoption transition is applied." };
}
