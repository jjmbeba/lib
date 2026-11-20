---
Status: superseded by ADR-0005
---

# Go API owns v1 persistence

V1 includes a Go API that owns Book CRUD and persistence on the user's device, using a local SQLite database instead of browser-only storage. The Go service serves the Vue app and API from localhost, and v1 is not hosted. This establishes the backend boundary before planned v2 authentication and external storage, at the cost of running a local service in v1.
