# Calendar Workbench

A small, dependency-free calendar application and REST API. It includes a printable calendar studio, deterministic Gregorian month grids, ISO week calculations, a boundary-check dashboard, and proleptic Gregorian/Julian conversion using Julian Day Numbers.

## Features

- Generate monthly and yearly views for 2026–2035 with Monday or Sunday week starts.
- Export an individual month as JSON, SVG, PDF, or printable HTML; supports A4 and US Letter layouts in portrait or landscape.
- Query versioned REST endpoints with OpenAPI 3.1 documentation.
- Inspect leap-year, ISO week-year, December/January, month-grid, and UTC date-only boundary fixtures.
- Convert between proleptic Gregorian and Julian dates, with the JDN shown separately.
- No application runtime dependencies, database, account, or secret configuration.

## Run locally

Requires Node.js 20 or newer.

```sh
npm start
```

Open `http://localhost:8080`. The service listens on Railway's `PORT` environment variable, or port 8080 locally.

## API examples

```sh
curl http://localhost:8080/health
curl 'http://localhost:8080/api/v1/calendar/2027?weekStart=monday'
curl 'http://localhost:8080/api/v1/month-grid?year=2027&month=1&weekStart=sunday'
curl 'http://localhost:8080/api/v1/iso-week?date=2021-01-01'
curl 'http://localhost:8080/api/v1/convert?year=1900&month=3&day=1&from=julian&to=gregorian'
curl -o january-2027.pdf 'http://localhost:8080/api/v1/print?year=2027&month=1&format=pdf&paper=a4&orientation=portrait'
```

Full schema: `/openapi.json`; human-readable guide: `/docs`.

## Tests and checks

```sh
npm test
npm run check
```

The suite checks leap-year century exceptions, month-grid invariants, ISO week boundaries, invalid inputs, conversion vectors, and PDF output.

## Deploy on Railway

Deploy this repository as a single Docker service. The included `railway.json` selects the Dockerfile, serves `/health` as the health check, and restarts on failure. Railway provides `PORT` at runtime. The service has no database or required environment variables. A small instance is sufficient; choose the Free/Trial resources available to your workspace and monitor Usage before leaving a demo running.

## Calendar references

These independent printable-calendar examples are useful for comparing formats and dated layouts:

- [BetaCalendars 2026 yearly landing page](https://www.betacalendars.com/)
- [January 2027 calendar](https://www.betacalendars.com/january-calendar.html)
- [Monthly calendars](https://www.betacalendars.com/monthly-calendar)
- [Blank calendar](https://www.betacalendars.com/blank-calendar)
- [Weekly calendar](https://www.betacalendars.com/weekly-calendar)

The landing page is currently for 2026; individual month pages include 2027. This project is independent and is not affiliated with BetaCalendars.

## Calendar assumptions

Gregorian grids and ISO weeks use UTC-safe date-only arithmetic. Julian/Gregorian conversion uses integer arithmetic through JDN. Both calendars are extended proleptically; the converter does not model country-specific historical adoption dates or skipped local dates. A Julian Day Number is not the Julian calendar.

## Security and dependencies

The app serves only local static assets and fixed calendar API routes. It does not collect user input on a server-side account, persist calendar data, or use third-party runtime packages. Response headers restrict framing, permissions, and script sources. There are no secrets to configure.

## License

MIT. See [LICENSE](LICENSE).
