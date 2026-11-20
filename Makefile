.PHONY: api-dev frontend-dev frontend-build lint format-check typecheck sqlc generate-api

api-dev:
	cd backend && go run ./cmd/library-api

frontend-dev:
	cd frontend && pnpm dev

frontend-build:
	cd frontend && pnpm build

lint:
	cd frontend && pnpm lint

format-check:
	cd frontend && pnpm format:check

typecheck:
	cd frontend && pnpm typecheck

sqlc:
	cd backend && go tool sqlc generate

generate-api:
	cd frontend && pnpm generate:api
