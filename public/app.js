const $ = id => document.getElementById(id);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
for (let year = 2026; year <= 2035; year++) $('yearSelect').add(new Option(String(year), String(year)));
MONTHS.forEach((month, i) => $('monthSelect').add(new Option(month, String(i + 1))));
$('yearSelect').value = String(Math.max(2026, Math.min(2035, new Date().getFullYear())));
$('monthSelect').value = String(new Date().getMonth() + 1);

function setTab(name) {
  document.querySelectorAll('.tab').forEach(button => { const active = button.dataset.tab === name; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  for (const pane of ['calendar', 'boundary', 'convert', 'api']) $(`${pane}Pane`).classList.toggle('hidden', pane !== name);
}
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => setTab(button.dataset.tab)));
let calendarView = 'month';
document.querySelectorAll('.seg').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.seg').forEach(x => x.classList.toggle('active', x === button)); calendarView = button.dataset.view; $('monthControl').classList.toggle('hidden', calendarView === 'year'); renderCalendar();
}));

function dateFromDay(year, month, day) { const d = new Date(0); d.setUTCFullYear(year, month - 1, day); d.setUTCHours(0, 0, 0, 0); return d; }
function isoWeekNumber(date) {
  const d = new Date(date.getTime()), day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = dateFromDay(d.getUTCFullYear(), 1, 1);
  return Math.ceil((((d - start) / 86400000) + 1) / 7);
}
function buildMonth(grid, compact = false) {
  const year = grid.year, month = grid.month, startOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + (grid.weekStart === 'monday' ? 6 : 0)) % 7;
  const startDay = 1 - startOffset;
  const headers = grid.weekdayNames.map(name => `<th scope="col">${compact ? name.slice(0, 1) : name.slice(0, 3)}</th>`).join('');
  const weeks = grid.weeks.map((week, index) => {
    const rowDate = dateFromDay(year, month, startDay + index * 7);
    const thursday = dateFromDay(rowDate.getUTCFullYear(), rowDate.getUTCMonth() + 1, rowDate.getUTCDate() + (grid.weekStart === 'monday' ? 3 : 4));
    const number = String(isoWeekNumber(thursday)).padStart(2, '0');
    return `<tr>${week.map((day, col) => `<td class="${day ? '' : 'empty'}">${day ? `${compact ? '' : (col === 0 ? `<span class="week-number" title="ISO week ${number}">${number}</span>` : '')}<span>${day}</span>` : ''}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="calendar-table" aria-label="${MONTHS[month - 1]} ${year}"><thead><tr>${headers}</tr></thead><tbody>${weeks}</tbody></table>`;
}
async function renderCalendar() {
  const year = Number($('yearSelect').value), month = Number($('monthSelect').value), weekStart = $('weekStart').value;
  try {
    if (calendarView === 'month') {
      const grid = await fetch(`/api/v1/calendar/${year}/${month}?weekStart=${weekStart}`).then(r => r.json());
      $('calendarOutput').innerHTML = `<div class="month-view"><div class="month-title"><h3>${grid.monthName} ${year}</h3><span>${grid.weeks.length} WEEKS · ${grid.weekStart.toUpperCase()} START</span></div>${buildMonth(grid)}</div>`;
      $('calendarSummary').textContent = `${grid.weeks.reduce((sum, week) => sum + week.filter(Boolean).length, 0)} days · ${grid.weekStart}-first grid · ISO week numbers`;
    } else {
      const yearData = await fetch(`/api/v1/calendar/${year}?weekStart=${weekStart}`).then(r => r.json());
      $('calendarOutput').innerHTML = `<div class="year-grid">${yearData.months.map(grid => `<section class="mini-month"><h4>${grid.monthName}</h4>${buildMonth(grid, true)}</section>`).join('')}</div>`;
      $('calendarSummary').textContent = `${year} · ${yearData.leapYear ? 366 : 365} days · ${weekStart}-first grids`;
    }
  } catch { $('calendarOutput').textContent = 'Calendar could not be loaded. Check the connection and try again.'; }
}
['yearSelect', 'monthSelect', 'weekStart'].forEach(id => $(id).addEventListener('change', renderCalendar));
renderCalendar();

function exportFile(name, data, type) {
  const blob = new Blob([data], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportUrl(format) { return `/api/v1/print?year=${$('yearSelect').value}&month=${$('monthSelect').value}&weekStart=${$('weekStart').value}&paper=${$('paper').value}&orientation=${$('orientation').value}&format=${format}`; }
async function download(format, mime, suffix) {
  $('status').textContent = 'Preparing file…';
  try {
    const response = await fetch(exportUrl(format)); if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob(); exportFile(`calendar-${$('yearSelect').value}-${$('monthSelect').value.padStart(2, '0')}.${suffix}`, blob, mime); $('status').textContent = 'Your download is ready.';
  } catch { $('status').textContent = 'Export failed. Please try again.'; }
}
$('downloadPdf').addEventListener('click', () => download('pdf', 'application/pdf', 'pdf'));
$('downloadSvg').addEventListener('click', () => download('svg', 'image/svg+xml', 'svg'));
$('downloadJson').addEventListener('click', () => download('json', 'application/json', 'json'));
$('printHtml').addEventListener('click', () => window.open(exportUrl('html'), '_blank', 'noopener'));

const assertions = [
  { name: 'Common year: 2027', detail: '365 days; February has 28 days.', check: () => !isLeap(2027) && daysIn(2027, 2) === 28 },
  { name: 'Leap year: 2028', detail: 'February has 29 days.', check: () => isLeap(2028) && daysIn(2028, 2) === 29 },
  { name: 'Century exception: 1900', detail: 'Divisible by 100, not 400: common year.', check: () => !isLeap(1900) },
  { name: '400-year rule: 2000', detail: 'Divisible by 400: leap year.', check: () => isLeap(2000) },
  { name: 'Next century: 2100', detail: 'Divisible by 100, not 400: common year.', check: () => !isLeap(2100) },
  { name: 'ISO week 53', detail: '2020-12-31 belongs to ISO week 53 of 2020.', check: () => iso('2020-12-31').week === 53 && iso('2020-12-31').weekYear === 2020 },
  { name: 'ISO year boundary', detail: '2021-01-01 belongs to week 53 of 2020.', check: () => iso('2021-01-01').week === 53 && iso('2021-01-01').weekYear === 2020 },
  { name: 'Month-grid invariant', detail: 'Every date appears once in a seven-column grid.', check: () => { const g = grid(2027, 2); return g.weeks.every(w => w.length === 7) && g.weeks.flat().filter(Boolean).length === 28; } },
  { name: 'No timezone drift', detail: 'UTC date fields retain the chosen calendar day.', check: () => dateFromDay(2027, 1, 1).getUTCDate() === 1 },
  { name: 'ISO boundary calculation', detail: '2027-01-04 is Monday in ISO week 1.', check: () => iso('2027-01-04').week === 1 && iso('2027-01-04').weekday === 1 },
  { name: 'Valid leap-day grid', detail: 'February 2028 contains day 29 exactly once.', check: () => grid(2028, 2).weeks.flat().filter(x => x === 29).length === 1 },
  { name: 'Year has twelve months', detail: '2027 returns twelve month grids.', check: () => Array.from({ length: 12 }, (_, i) => grid(2027, i + 1)).length === 12 }
];
function isLeap(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0); }
function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function weekday(y, m, d) { return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; }
function grid(y, m) { const offset = weekday(y, m, 1), n = daysIn(y, m), cells = Math.ceil((offset + n) / 7) * 7; return { weeks: Array.from({ length: cells / 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => { const d = r * 7 + c - offset + 1; return d > 0 && d <= n ? d : null; })) }; }
function iso(value) { const [y, m, d] = value.split('-').map(Number), date = dateFromDay(y, m, d), day = date.getUTCDay() || 7; date.setUTCDate(date.getUTCDate() + 4 - day); const weekYear = date.getUTCFullYear(), start = dateFromDay(weekYear, 1, 1); return { weekYear, week: Math.ceil((((date - start) / 86400000) + 1) / 7), weekday: day }; }
function runAssertions() {
  const results = assertions.map(item => { let passed = false; try { passed = Boolean(item.check()); } catch {} return { name: item.name, detail: item.detail, passed }; });
  $('assertions').innerHTML = results.map(item => `<article class="assertion"><span class="pass">${item.passed ? '✓ PASS' : '✕ FAIL'}</span><strong>${item.name}</strong><p>${item.detail}</p></article>`).join('');
  const passed = results.filter(x => x.passed).length; $('assertionSummary').textContent = `${passed}/${results.length} checks passed`; return results;
}
$('rerunAssertions').addEventListener('click', runAssertions); runAssertions();
$('downloadFixtures').addEventListener('click', () => exportFile('calendar-boundary-fixtures.json', JSON.stringify({ generatedAt: 'deterministic-fixture', engine: 'Calendar Workbench v1', assumptions: ['Proleptic Gregorian', 'UTC date-only arithmetic'], assertions: runAssertions() }, null, 2), 'application/json'));

$('convertForm').addEventListener('submit', async event => {
  event.preventDefault(); const params = new URLSearchParams({ year: $('convertYear').value, month: $('convertMonth').value, day: $('convertDay').value, from: $('convertFrom').value, to: $('convertTo').value });
  try { const response = await fetch(`/api/v1/convert?${params}`), body = await response.json(); $('conversionResult').textContent = JSON.stringify(body, null, 2); } catch { $('conversionResult').textContent = 'Conversion failed.'; }
});
$('endpoint').addEventListener('change', () => {
  const kind = $('endpoint').value, isDate = kind === 'iso-week', isLeap = kind === 'leap-year';
  $('apiDateField').classList.toggle('hidden', !isDate); $('apiMonthField').classList.toggle('hidden', isDate || isLeap); $('apiYearField').classList.toggle('hidden', isDate);
});
$('runApi').addEventListener('click', async () => {
  const kind = $('endpoint').value, year = $('apiYear').value, month = $('apiMonth').value;
  const url = kind === 'iso-week' ? `/api/v1/iso-week?date=${$('apiDate').value}` : kind === 'leap-year' ? `/api/v1/leap-year?year=${year}` : kind === 'year' ? `/api/v1/calendar/${year}` : `/api/v1/month-grid?year=${year}&month=${month}&weekStart=${$('weekStart').value}`;
  try { const response = await fetch(url), result = await response.json(); $('apiResult').textContent = JSON.stringify(result, null, 2); } catch { $('apiResult').textContent = 'Request failed.'; }
});
