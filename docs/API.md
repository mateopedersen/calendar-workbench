# API reference

The live schema is served from `/openapi.json`; an HTML guide is served from `/docs`.

| Route | Purpose |
| --- | --- |
| `GET /health` | Readiness status and version |
| `GET /api/v1/calendar/{year}` | Twelve month grids for 2026–2035 |
| `GET /api/v1/calendar/{year}/{month}` | One month grid |
| `GET /api/v1/month-grid?year=&month=&weekStart=` | Query-style month fixture |
| `GET /api/v1/iso-week?date=YYYY-MM-DD` | ISO week number, week-year, weekday |
| `GET /api/v1/leap-year?year=` | Gregorian leap-year rule |
| `GET /api/v1/convert?year=&month=&day=&from=&to=` | Proleptic Gregorian/Julian conversion with JDN |
| `GET /api/v1/print?year=&month=&format=` | JSON, SVG, HTML, or PDF output |

Week start can be `monday` or `sunday`. Print format can be `json`, `svg`, `html`, or `pdf`. PDF also accepts `paper=a4|letter` and `orientation=portrait|landscape`. Invalid inputs return status 400 with a JSON `error` and `message`.
