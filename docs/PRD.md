# Library Book Tracking v1 PRD

## Problem Statement

Readers need a simple personal place to record Books and see which ones they plan to read, are reading, or have completed. A list that exists only in memory or scattered notes is difficult to maintain, search, and carry between devices. Users also need to correct details, change a Book's status as their reading changes, and move their library through a portable file.

V1 is for one person using one computer. It should stay useful without an internet connection while the local service is running, and it should not require an account or a hosted service.

## Solution

Build a responsive browser app for one person's reading library. Each Book represents a particular edition or format of a work, with a required title and optional author and ISBN. Books have one of three statuses: To read, Currently reading, or Completed.

The user can add, edit, browse, search, change status, and permanently delete Books. The app stores the library in a local SQLite database through a Go API. CSV export and import provide portability and restore support. ISBNs are entered manually in v1; lookup and scanning are deferred.

## User Stories

1. As a reader, I want to add a Book with only its title, so that I can save it even when I do not know the author or ISBN.
2. As a reader, I want to enter an optional author and ISBN while adding a Book, so that I can keep the details I already know.
3. As a reader, I want a new Book to default to To read while allowing me to choose another status, so that adding a planned read is quick without restricting other cases.
4. As a reader, I want to add different editions or formats of the same work as separate Books, so that each can have its own status.
5. As a reader, I want to save Books with the same title and author, so that editions, formats, and incomplete details are not incorrectly treated as duplicates.
6. As a reader, I want an invalid ISBN to prevent saving and show an error beside the ISBN field, so that I can correct the number.
7. As a reader, I want to enter ISBNs with spaces or hyphens, so that I can use the number as printed while the app validates its check digit.
8. As a reader, I want an ISBN already used by another Book to be rejected, including an ISBN-10 and its equivalent 978 ISBN-13, so that one identifier cannot be assigned to two entries.
9. As a reader, I want to edit a Book's title, author, and ISBN at any time, so that I can fix mistakes and fill in missing details.
10. As a reader, I want to change a Book directly to any status, so that I can correct its state or reopen it when rereading.
11. As a reader, I want to track multiple Books as Currently reading, so that the app does not impose a reading habit on me.
12. As a reader, I want rereading a Completed Book to reuse the same Book entry, so that v1 stays focused on current status rather than reading history.
13. As a reader, I want to permanently delete a Book after confirming, so that I can remove entries I no longer want without deleting them accidentally.
14. As a reader, I want separate To read, Currently reading, and Completed views, so that I can browse by reading status.
15. As a reader, I want the library to open on Currently reading, so that my active Books are visible first.
16. As a reader, I want each status view to show the most recently added Books first, so that new entries are easy to find.
17. As a reader, I want each Book row to show its title and author when available, so that I can recognize entries quickly.
18. As a reader, I want to change a Book's status directly from its row, so that routine updates take fewer steps.
19. As a reader, I want an empty status view to explain that it has no Books and offer an Add Book action, so that I know what I can do next.
20. As a reader, I want to search across all statuses by partial, case-insensitive title or author text, so that I can find a Book without changing views or entering its full name.
21. As a reader, I want search results to show each Book's status, so that I can understand its reading state even when results come from multiple views.
22. As a reader, I want the library to remain available after closing and reopening the app, so that my list is not lost between sessions.
23. As a reader, I want to use the app without an internet connection while the local service is running, so that local reading-list work does not depend on network access.
24. As a reader, I want the interface to adapt to desktop and phone-sized screens, so that the same app remains usable at different viewport sizes.
25. As a reader, I want successful add, edit, status change, delete, import, and export actions to show a brief confirmation, so that I know the action completed.
26. As a reader, I want to export all Books as a CSV with stable identifiers and added timestamps, so that I can open the data elsewhere or keep a portable copy.
27. As a reader, I want to import a CSV previously exported by the app and merge it into my library by stable identifier, so that new Books are added and matching Books can be restored or updated.
28. As a reader, I want to preview every Book an import will add or update before confirming, so that I can spot unintended changes.
29. As a reader, I want an import with any invalid row, invalid ISBN, ISBN conflict, or repeated Book identifier to be rejected entirely, so that I do not unknowingly end up with a partial import.
30. As a reader, I want import errors to identify the affected row and reason, so that I can fix the CSV and try again.
31. As a reader, I want an import to preserve the added timestamp for new Books and apply the imported timestamp when updating a matching Book, so that a restored library retains its exported ordering data.

## Implementation Decisions

- V1 is a single-user, single-device, local browser app. It is not hosted and has no authentication, external storage, or cross-device synchronization.
- The repository is a Go/Vue monorepo. The Go API owns Book CRUD and persistence; the service listens only on the local interface. The Vue frontend and Go API run as separate local processes. During development, Vite proxies API requests to Go.
- Store data in a local SQLite database using `mattn/go-sqlite3`; Goose manages embedded SQL migrations and sqlc generates typed Go database methods.
- Use Go 1.27 or newer for the standard-library UUID package.
- Keep Book domain rules independent of persistence so a later authenticated, remotely stored version can preserve them.
- Use `create-vue` with Vite, TypeScript, Vue Router, and Tailwind CSS v4. Organize frontend code by feature, with shared UI, API setup, and navigation separate from Book-specific screens and components. Use pnpm while retaining Node.js as the frontend runtime.
- Use TanStack Query Vue for API-backed server state. Generate typed API clients, API types, and Vue Query composables from the OpenAPI contract with Orval; keep Go handlers hand-written.
- Use VeeValidate for Vue form state and Valibot schemas through `@vee-validate/valibot`. Show field errors after blur, update them as touched fields are corrected, and validate all fields on submission. The Go API remains authoritative for ISBN check digits and ISBN conflicts.
- Fetch the complete Book library and filter and sort it in Vue. V1 has no pagination or per-keystroke search requests.
- Use standard-library Go `net/http` `ServeMux` for API routing and REST-style JSON endpoints plus CSV import/export endpoints.
- Return errors as RFC 9457 Problem Details with an `errors` extension. Each error has a `field` and `detail`; CSV row errors also have a `row`. Use HTTP 400 for malformed JSON/CSV syntax, 422 for well-formed requests with invalid values, and 409 for an ISBN conflict with an existing Book.
- Generate stable Book identifiers as UUIDv7 using Go's standard-library UUID package; store canonical UUID text in SQLite. Preserve identifiers in CSV and sort by explicit `added_at`, not by UUID.
- Store `added_at` as Unix microseconds in a SQLite integer and use UTC RFC3339Nano in CSV. The timestamp is represented as Go `time.Time` at application boundaries.
- Preserve the ISBN text entered for display and maintain a separate canonical ISBN key for uniqueness. Strip spaces and hyphens from the key and convert ISBN-10 to its equivalent 978 ISBN-13. A small project-owned utility validates ISBN check digits.
- CSV uses UTF-8 and the fixed header row `id,title,author,isbn,status,added_at`; there is no separate format-version column in v1. Export all Books newest-first. On import, new IDs preserve the CSV timestamp and matching IDs update their stored timestamp. Imports are atomic and reject repeated IDs in the file.
- Use Vitest, Vue Test Utils, and jsdom for Vue unit and component tests. Defer browser-based end-to-end testing in v1.
- Use brief toast confirmations after successful add, edit, status change, delete, CSV import, and CSV export actions. Keep field validation and import errors close to the relevant input or row.
- Do not add a separate notice warning that library data is stored in this browser/device.
- Keep visual design aligned with the existing Paper design work, including the established light and dark color tokens and responsive layouts.

## Testing Decisions

- Good tests verify externally observable behavior rather than private implementation details. Prefer HTTP requests and responses, resulting persisted Books, and user interactions with rendered Vue components.
- Test Go ISBN validation and canonical ISBN equivalence, Book rules, CRUD and CSV endpoints, atomic import behavior, and migration-backed SQLite persistence at the highest practical service/API seam. Include cases for invalid check digits, duplicate ISBN equivalence, repeated IDs in one file, matching-ID updates, and no partial writes after an invalid import.
- Test Vue form behavior, field errors, list filtering and ordering, search across statuses, direct status changes, toasts, empty states, and CSV preview/confirmation through Vue Test Utils user interactions.
- Test tooling selected for the Vue layer is Vitest + Vue Test Utils with jsdom. Browser end-to-end tests are deferred; responsive visual layout and full cross-process browser behavior will not be proven by this initial test setup.
- The current repository contains product/technical documentation and ADRs but no application implementation or existing tests, so there is no test suite prior art to extend. Establish these seams in the first implementation slice.

## Out of Scope

- ISBN lookup, metadata lookup, and barcode scanning.
- User-supplied cover images.
- Page counts, percentage progress, or separate reading history for rereads.
- Physical-copy inventory, lending, or stock tracking.
- Authentication, hosting, remote storage, and cross-device synchronization.
- Phone access to a service running on a separate computer; responsive layout alone is in scope.
- Archive or soft-delete behavior.
- CSV import from arbitrary third-party formats; v1 accepts the app's own export contract.
- Automated browser-based end-to-end testing in the initial v1 test setup.

## Further Notes

- The domain glossary in `CONTEXT.md` defines Book as an edition or format saved in a personal reading library, not an owned physical copy. Use that vocabulary throughout implementation.
- The product workflow and technical stack decisions are documented separately; this PRD consolidates them for implementation planning.
- The PRD's test seams are proposed from the agreed stack and current docs-only repository state. Confirm those seams before using this as an implementation ticket.
- V2 may add ISBN lookup/scanning, authentication, remote storage, hosting, and cross-device synchronization; those require new product and migration decisions.
