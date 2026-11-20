---
Status: superseded by ADR-0004
---

# Single-user, single-device v1

V1 was scoped as a browser app storing its library in the current browser on one device, without authentication, remote storage, or cross-device synchronization. That storage decision was superseded when the Go API became responsible for CRUD and persistence in v1; the single-user and no-sync constraints remain.
