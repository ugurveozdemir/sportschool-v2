# Changelog

## 2026-05-16

- Added Development-only PlatformOwner bootstrap endpoint for the first local/admin user.
- Added PlatformOwner-protected school management endpoints for creating/deactivating schools and creating SchoolAdmin users.
- Added temporary SchoolAdmin password generation and authorization tests for platform endpoints.
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
- Add SchoolAdmin endpoints for creating Coach users.
- Add integration coverage for successful bootstrap/login/platform-management flow against PostgreSQL.

# Notes

- Keep `README.md` product-facing only; ongoing implementation notes belong here.
- User email uniqueness is tenant-scoped through `SchoolId + NormalizedEmail`; platform-owner emails are globally unique where `SchoolId` is null.
- Refresh tokens are stored as hashes and rotate per device session; refreshing one device does not revoke other devices.
- The first PlatformOwner is created through `/api/bootstrap/platform-owner` only in Development.
