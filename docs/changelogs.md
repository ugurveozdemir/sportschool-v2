# Changelog

## 2026-05-16

- Added JWT login/refresh/logout foundation with multi-device refresh token storage and token rotation.
- Added password hashing, token hashing, auth DTOs, and refresh token tests.
- Updated `README.md` to describe the product, moved local agent notes to ignored `AGENTS.md`, and added `AGENTS.md` to `.gitignore`.
- Added the first tenant/auth data model: schools, users, role assignments, and EF Core mappings.
- Added the initial identity schema migration for PostgreSQL.
- Added metadata tests for tenant-scoped user uniqueness, platform-owner email uniqueness, and role assignment keys.
- Initialized the backend solution with an ASP.NET Core API project and xUnit test project.
- Added PostgreSQL local development wiring through Docker Compose and EF Core's Npgsql provider.
- Replaced the template weather endpoint with a small `/api/health` endpoint and a matching integration test.

# Todo

- Add tenant isolation tests before building feature endpoints.
- Add initial PlatformOwner and SchoolAdmin management endpoints.
- Add seeded/local bootstrap path for the first PlatformOwner.

# Notes

- Keep `README.md` product-facing only; ongoing implementation notes belong here.
- User email uniqueness is tenant-scoped through `SchoolId + NormalizedEmail`; platform-owner emails are globally unique where `SchoolId` is null.
- Refresh tokens are stored as hashes and rotate per device session; refreshing one device does not revoke other devices.
