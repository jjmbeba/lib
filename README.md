# Library Book Tracking

A local, single-user reading library. The v1 product and technical decisions are documented in `docs/`.

## Frontend

```sh
cd frontend
pnpm install
pnpm dev
```

The Vue app is scaffolded with its router, query client, styling, validation, API generation, linting, formatting, and test tooling. Feature behavior is not implemented yet.

## Backend

The Go module and package layout are scaffolded. The API entry point is intentionally inert until backend behavior is implemented.

The Go module path is temporarily `example.com/library-book-tracking/backend` because this local repository has no Git remote configured. Replace it with the canonical repository path before adding cross-package imports or publishing the module.

## Code generation

The frontend API generator reads `backend/openapi/openapi.yaml`; the sqlc configuration lives at `backend/sqlc.yaml`. Both contracts are placeholders until their schemas and operations are designed.
