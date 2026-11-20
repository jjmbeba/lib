# Technical design

This document translates the v1 product decisions into implementation constraints and records selected stack decisions. The product behavior is defined in [v1-workflow.md](./v1-workflow.md); shared domain language is in [CONTEXT.md](../CONTEXT.md).

## System boundary

- V1 is a responsive browser application for one person, used on one device.
- The repository is a monorepo with a Vue frontend and a Go API. The API owns Book CRUD and persistence in v1.
- V1 is a local tool and is not hosted. The Go API and Vue frontend run as separate local processes; bundling or packaging them together can be revisited later.
- Phone-sized layouts are supported, but the local Go service does not need to run on or be reachable from a phone.
- The database is SQLite and runs locally on that device as a database file.
- The Go database driver is `mattn/go-sqlite3`; building the API requires CGO and GCC.
- V1 has no account system, external storage, or cross-device synchronization. It works without internet while the local service is running.
- Keep Book rules independent from the persistence mechanism so v2 can add authentication and external storage without making ISBN, status, and import/export rules storage-specific.

## Logical data model

| Field | Requirement | Rule |
| --- | --- | --- |
| Book identifier | Required | Stable identifier for the library entry; distinct from ISBN. Used to match entries in CSV import/export. |
| Title | Required | A Book represents a particular edition or format of a work. Matching titles do not imply the same Book. |
| Author | Optional | Searchable when present. |
| ISBN | Optional | When present, must pass ISBN-10 or ISBN-13 check-digit validation. Spaces and hyphens are ignored for validation and duplicate comparison. |
| Reading status | Required | One of `To read`, `Currently reading`, or `Completed`; new Books default to `To read`. |
| Added at | Required internally | UTC timestamp set when a Book is first added; used to sort newest Books first and included in CSV for restore. |

V1 allows multiple Books with matching titles and authors. An ISBN can appear on only one Book in the library; duplicate checks also recognize an ISBN-10 and its equivalent 978 ISBN-13 as the same identifier. ISBN validation and comparison must follow the International ISBN Agency's rules for ISBN-10/ISBN-13 conversion; a 979 ISBN-13 has no ISBN-10 equivalent ([guidance](https://www.isbn-international.org/node/331)).

There is no separate reading-session or owned-copy record in v1. Changing a Book's status updates that Book. Rereading reopens the same edition/format record.

## Domain operations and invariants

### Add or edit a Book

- Require a non-empty title; allow an empty author or ISBN.
- When ISBN is supplied, validate its format and check digit. Accept spaces and hyphens, ignoring them for validation and duplicate checks.
- Reject an invalid or already-used ISBN and associate the error with the ISBN field.
- Permit the same title and author on multiple Book records.

### Change status

- Allow direct transitions between all three statuses.
- Allow multiple Books to be `Currently reading` simultaneously.
- Do not create a reading-history record when reopening a `Completed` Book.
- Do not store page, percentage, or other reading progress in v1.

### Delete a Book

- Delete permanently after user confirmation. No archive or soft-delete behavior is part of v1.

### Browse and search

- Provide one view per status, opening on `Currently reading` by default.
- Sort each view by most recently added first.
- Search the whole library by partial, case-insensitive title and author text, and show each result's status.
- Each list row shows title and author when present; ISBN stays in Book details.

## CSV exchange

### Export

- Export all current Books with a stable Book identifier, title, optional author, optional ISBN, and status.
- Export each Book's `added_at` timestamp and write rows newest-first for readability.
- Exact header names, encoding, quoting, and version marker are left to stack-specific design.

### Import

- Accept CSV files previously exported by this app.
- Match rows to existing Books by stable identifier. Update a matching Book; add a row with a new identifier.
- For a new Book ID, preserve the CSV's `added_at` timestamp.
- For a matching Book ID, update its stored `added_at` timestamp from the CSV as part of the imported record.
- Validate the complete resulting library before applying changes: required title, supported status, valid optional ISBN, and unique ISBN across Books (including equivalent ISBN-10/978 ISBN-13 forms).
- Treat import as atomic. If any row fails validation or ISBN uniqueness, make no changes and report the row and reason.
- For a valid file, preview each Book to add or update and require confirmation before applying the import.
- Reject the entire CSV if a Book ID occurs more than once, and identify the duplicate rows.
- Malformed CSV diagnostics and CSV versioning remain for stack-specific design.

## Persistence and migration boundary

- V1 data is persisted by the local Go API and survives closing and reopening the app. The service should listen only on the local interface.
- CSV export/import is the supported way to move a library in v1; there is no automatic synchronization or recovery service.
- Stable Book identifiers should remain unchanged when a Book is edited or changes status.
- Hosting is deferred in v1. Authentication and external storage may be added in v2; account ownership, local-to-remote migration, conflict resolution, and cross-device synchronization must be designed with that work.

## Deferred from v1

- ISBN lookup and barcode scanning.
- Cover images.
- Reading progress and per-read history.
- Physical-copy inventory and lending.
- Authentication, external storage, and cross-device synchronization.

## Stack-specific decisions

### Selected

- Monorepo with a Go API that owns CRUD and persistence in v1, plus a Vue frontend.
- Organize the Vue app by feature: keep Book screens and Book-specific components together, with shared UI, API setup, and app navigation separate. Keep the structure small while Books are the only core domain.
- Local SQLite database accessed through `mattn/go-sqlite3`; building the API requires CGO and GCC.
- Vue frontend build setup: use `create-vue` with Vite for a client-side app; Vue CLI is in maintenance mode. Node.js 24.18.0 in the current environment meets the documented `create-vue` requirement (`^22.18.0 || >=24.12.0`). Sources: [Vue tooling guide](https://vuejs.org/guide/scaling-up/tooling) and [Vue quick start](https://vuejs.org/guide/quick-start).
- Vue frontend uses TypeScript; run `vue-tsc` for type checking because Vite only transpiles TypeScript. Sources: [Vue TypeScript guide](https://vuejs.org/guide/typescript/overview) and [Vue quick start](https://vuejs.org/guide/quick-start).
- Use ESLint with `eslint-plugin-vue` and `@vue/eslint-config-typescript` for JavaScript, TypeScript, and Vue Single-File Component linting; use Oxfmt for formatting and `vue-tsc` for type checking. Keep linting, formatting, and type checking as separate commands. Sources: [Vue tooling guide](https://vuejs.org/guide/scaling-up/tooling), [Vue ESLint config guide](https://eslint.vuejs.org/user-guide/), and [Oxfmt language support](https://oxc.rs/docs/guide/usage/formatter/language-support).
- Use pnpm for Vue package management while keeping Node.js as the frontend runtime; commit `pnpm-lock.yaml` and use frozen-lockfile installs in CI. Source: [pnpm install](https://pnpm.io/cli/install).
- Use Vitest with Vue Test Utils for Vue unit and component tests; Vitest shares the Vite configuration and Vue Test Utils mounts Vue components for interaction tests. Sources: [Vue testing guide](https://vuejs.org/guide/scaling-up/testing.html) and [Vue Test Utils](https://test-utils.vuejs.org/guide/).
- Configure Vitest component tests to use jsdom for a broader browser API surface; test execution speed is not a bottleneck for this small suite. Source: [Vitest test environments](https://vitest.dev/guide/environment.html).
- Defer browser-based end-to-end testing in v1; begin with Go tests and Vue unit/component tests, and add Playwright if full-browser integration coverage becomes necessary.
- Style the Vue UI with Tailwind CSS v4 and define the Paper-derived color, typography, spacing, and theme tokens in CSS. Sources: [Tailwind Vite guide](https://tailwindcss.com/docs/installation/using-vite) and [Tailwind theme variables](https://tailwindcss.com/docs/theme).
- Vue Router for URL-based navigation between the library's status views. Sources: [Vue Router guide](https://router.vuejs.org/guide/) and [Vue Router introduction](https://router.vuejs.org/introduction.html).
- TanStack Query Vue for API-backed Book data, cache state, and mutation-driven refresh; local UI state stays in components or composables unless a shared-state need appears. Sources: [TanStack Query Vue: server state vs client state](https://tanstack.com/query/latest/docs/framework/vue/guides/does-this-replace-client-state) and [Vue Query mutations](https://tanstack.com/query/latest/docs/framework/vue/guides/mutations).
- Use VeeValidate for Vue form state, submission, and field-level errors, with Valibot schemas through `@vee-validate/valibot`. Keep the Go API authoritative for ISBN validity and duplicate conflicts. Sources: [VeeValidate typed schemas](https://vee-validate.logaretm.com/v4/guide/composition-api/typed-schema/) and [Valibot](https://valibot.dev/).
- Show field validation after blur, then update errors while a touched field is corrected; validate all fields on submit. API validation responses, including ISBN duplicate conflicts, appear on the corresponding field.
- Go API routing uses the standard library `net/http` `ServeMux`; Go 1.22+ method patterns and path wildcards cover the small CRUD API. Sources: [Go 1.22 routing enhancements](https://go.dev/blog/routing-enhancements) and [net/http ServeMux docs](https://pkg.go.dev/net/http#ServeMux).
- Expose Book CRUD through a REST-style JSON API and CSV import/export endpoints.
- Maintain an OpenAPI contract and use Orval to generate typed Vue Query composables, request functions, and API types; Go handlers remain hand-written against the contract. Configure mutation invalidation for affected queries. This reduces handwritten API/cache glue while keeping the contract as the source of truth. Sources: [Orval Vue Query guide](https://orval.dev/docs/guides/vue-query/) and [Orval mutation invalidation configuration](https://orval.dev/docs/reference/configuration/output/).
- Fetch the complete Book library through the API once and filter/sort locally in Vue for status views and search; no pagination or per-keystroke search requests in v1.
- Return API errors using RFC 9457 Problem Details with an `errors` extension; each validation item carries `field` and `detail`, and CSV diagnostics also carry `row`. Source: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html).
- Use `400` for malformed JSON/CSV syntax, `422` for well-formed requests with invalid field values, and `409` when an ISBN conflicts with an existing Book. Source: [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html).
- SQLite schema migrations use Goose with SQL migration files embedded in the Go binary. Sources: [Goose README](https://github.com/pressly/goose) and [embedded migrations guide](https://pressly.github.io/goose/blog/2021/embed-sql-migrations/).
- Use sqlc to generate typed Go query methods from SQL for the SQLite database. Sources: [sqlc SQLite guide](https://docs.sqlc.dev/en/latest/tutorials/getting-started-sqlite.html) and [sqlc generation docs](https://docs.sqlc.dev/en/latest/howto/generate.html).
- Declare the pinned sqlc CLI as a Go tool dependency in `backend/go.mod` so `go tool sqlc generate` uses the repository's selected version.
- During development, the Go API and Vue/Vite dev server run as separate processes; Vite proxies `/api` requests to Go. Source: [Vite server proxy](https://vite.dev/config/server-options#server-proxy).
- Go 1.27 is the minimum toolchain; use its standard-library `uuid` package for Book identifiers. Sources: [Go 1.27 release notes](https://go.dev/doc/go1.27#uuid) and [standard-library uuid package](https://pkg.go.dev/uuid).
- Generate Book identifiers as UUID v7 with `uuid.NewV7()`. Preserve the identifier during CSV import; use the explicit added-order field, not UUID ordering, for newest-first product sorting. UUID v7 embeds approximate generation time, which is visible in exported IDs. Sources: [UUID v4 vs v7 research](./research/uuid-v4-v7.md) and [standard-library uuid package](https://pkg.go.dev/uuid).
- Store UUID v7 Book identifiers as canonical text in SQLite.
- Store the SQLite database in an application-specific subdirectory under the OS-provided per-user directory resolved with `os.UserConfigDir()`. Source: [Go `os.UserConfigDir`](https://pkg.go.dev/os#UserConfigDir).
- Store `added_at` as Unix microseconds in a SQLite `INTEGER`; export it as UTC RFC3339Nano and parse it into Go `time.Time`. A future PostgreSQL migration can retain it as `BIGINT` or convert it to `TIMESTAMPTZ` (microsecond precision). Sources: [Go `time` package](https://pkg.go.dev/time) and [PostgreSQL date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html).
- ISBN validation uses a small project-owned utility for ISBN-10/ISBN-13 check digits and agreed normalization.
- Preserve the ISBN text as entered for display and store a separate canonical ISBN key for duplicate enforcement. The canonical key strips separators and converts ISBN-10 to its equivalent 978 ISBN-13.
- CSV export includes `added_at` and writes rows newest-first; new imported Books preserve the source timestamp.
- CSV uses the fixed UTF-8 header row `id,title,author,isbn,status,added_at`; imports require this header contract.
- Do not add a separate CSV format-version column in v1; recognize the format by its required header row.
- CSV imports also replace `added_at` on matching Book IDs.
- CSV import rejects duplicate Book IDs within the file and reports the affected rows.

### Code organization

- Keep `backend/`, `frontend/`, `docs/`, and `CONTEXT.md` at the repository root; do not add a JavaScript workspace layer for the single Vue app.
- Use `backend/cmd/library-api/` for startup/wiring; `backend/internal/books/` for Book rules and use cases; `backend/internal/httpapi/` for routing and handlers; and `backend/internal/sqlite/` for SQLite persistence, sqlc queries, and migrations. Avoid broad generic `models`, `services`, and `repositories` packages.
- Keep v1 startup wiring in `backend/cmd/library-api/main.go`: open SQLite, construct `books.Library`, build the HTTP server, and run it. Add an application package only if startup logic grows or needs reuse.
- Split SQLite files into `backend/internal/sqlite/migrations/` for Goose migrations, `queries/` for sqlc SQL sources, and `dbgen/` for generated Go code.
- Define `books.Store` in `backend/internal/books/store.go` at the use-case boundary; implement it in `backend/internal/sqlite/` using sqlc. Keep HTTP handlers as transport adapters, not owners of Book rules.
- Add a compile-time assertion in the SQLite adapter that its Store implementation satisfies `books.Store`.
- Implement Books use cases on a `books.Library` instance constructed with a `books.Store`, keeping the persistence dependency explicit and avoiding package-global storage.
- Define `books.Library`, its constructor, and core CRUD/status/search methods in `backend/internal/books/library.go`; keep CSV import preview/apply methods on `Library` in `import.go`.
- Define the `Book` and `Status` types with core Book rules in `backend/internal/books/book.go`.
- Keep the project-owned ISBN-10/ISBN-13 check-digit validator in `backend/internal/books/isbn.go` so manual entry and CSV import use the same Book rule.
- Organize `frontend/src/` into `app/` for the shell/router/query setup, `features/books/` for Book views/forms/search/CSV flows, `shared/ui/` for reusable design components, and `api/generated/` for Orval output.
- Keep the OpenAPI contract at `backend/openapi/openapi.yaml`; frontend code generation reads this contract and writes to `frontend/src/api/generated/`.
- Commit generated Orval client code and sqlc Go code; regenerate them explicitly when their OpenAPI contract or SQL query sources change.
- For CSV import, the Books use case computes and validates the complete resulting library before persistence. The SQLite adapter applies all additions and updates in one transaction, rolling back everything if any write fails.
- Provide a small root Makefile with separate targets for running the Go API and Vue frontend and for regenerating sqlc and Orval code.
- Expose separate frontend package scripts for linting, formatting, format checking, and TypeScript checking (`lint`, `format`, `format:check`, and `typecheck`).
- Group HTTP handlers by API area: `backend/internal/httpapi/books.go` handles Book CRUD and status changes, `csv.go` handles CSV import/export, and `server.go` owns router setup and middleware.
- Give `httpapi.Handler` a `*books.Library` dependency; construct it in `httpapi.NewServer` and register its methods on the router, with startup wiring the Store, Library, and server.
- Keep HTTP request and response types beside the handlers that use them; extract a separate file only when a type is genuinely shared.
- Keep CSV parsing and writing in `backend/internal/httpapi/csv.go`; the Books use case validates parsed rows, builds the preview, and applies the merge through `books.Store`.
- Put shared HTTP error mapping and RFC 9457 Problem Details response-writing helpers in `backend/internal/httpapi/errors.go`; route handlers use this helper for consistent error responses.
- Keep Go tests alongside the packages they cover in files such as `books_test.go` and `errors_test.go`; SQLite integration tests also live in `backend/internal/sqlite/`.


