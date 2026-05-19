# Changelog

## 2026-05-16

- Added ignored local API usage examples covering the current MVP flows from PlatformOwner bootstrap through athlete/parent mobile reads.
- Added authenticated password-change endpoint with current-password verification and active refresh-token revocation.
- Added password-change authorization and behavior tests.
- Added school roster endpoints for SchoolAdmin user/coach lists and Coach/SchoolAdmin athlete lists.
- Added roster tests proving school-scoped user/coach/athlete lists stay inside the current tenant.
- Added PlatformOwner list endpoints for schools and school admins.
- Added platform list tests covering inactive-school visibility, admin filtering, and missing-school 404 behavior.
- Added local development documentation for PostgreSQL, migrations, API run, PlatformOwner bootstrap, login, and platform setup.
- Added end-to-end bootstrap/login/platform-management integration coverage.
- Verified the first PlatformOwner can bootstrap, log in, create a school, and create a SchoolAdmin through HTTP endpoints.
- Added endpoint-level tenant isolation test infrastructure using a SQLite-backed `WebApplicationFactory`.
- Added tenant isolation tests proving school-scoped group lists and payment reads do not expose other tenants.
- Added Parent/Athlete read-only mobile endpoints for profile, groups, trainings, attendance, and payments.
- Added student payment tracking for Coach/SchoolAdmin users.
- Added monthly student payment uniqueness and effective status calculation where current/past Pending payments read as Unpaid.
- Added payment update/list endpoints, PostgreSQL migration, and payment tests.
- Added attendance/yoklama flow for training sessions.
- Added attendance uniqueness per training and athlete, with group-membership validation before recording.
- Added SchoolAdmin-only attendance correction endpoint.
- Added PostgreSQL migration and tests for attendance authorization and uniqueness.
- Added group management for Coach/SchoolAdmin users: create, update, deactivate, list, and athlete add/remove.
- Added group-athlete membership model; one athlete can belong to multiple groups.
- Added training management for Coach/SchoolAdmin users with single and weekly recurring training sessions.
- Added group-scoped training listing.
- Added athlete report creation/update for Coach/SchoolAdmin users, with read-only Parent/Athlete report listing.
- Added report score validation for `0-10` values in `0.5` increments.
- Added PostgreSQL migration and model/authorization tests for groups, trainings, and athlete reports.
- Added public athlete application endpoint with school-code lookup and duplicate pending-application protection.
- Added SchoolAdmin approval/rejection endpoints for athlete applications.
- Added AthleteProfile creation on approval; approved athlete users receive both Athlete and Parent roles with the same credential.
- Added PostgreSQL migration and model tests for athlete applications and athlete profiles.
- Added SchoolAdmin-protected coach management endpoint for creating Coach users inside the current tenant.
- Added support for assigning Coach role to an existing active school user without generating a second credential.
- Added current-user school claim helper and tests for school management authorization.
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

- Add API usage examples for the current MVP flows.
- Decide whether weekly training recurrence should remain a stored template or expand into dated occurrences before calendar UI work.

# Notes

- Keep `README.md` product-facing only; ongoing implementation notes belong here.
- User email uniqueness is tenant-scoped through `SchoolId + NormalizedEmail`; platform-owner emails are globally unique where `SchoolId` is null.
- Refresh tokens are stored as hashes and rotate per device session; refreshing one device does not revoke other devices.
- The first PlatformOwner is created through `/api/bootstrap/platform-owner` only in Development.
- Athlete approval creates one AppUser with both Athlete and Parent roles; parent details live on AthleteProfile for now.
- Training recurrence is currently stored as `None` or `Weekly`; recurrence expansion into concrete calendar occurrences is not implemented yet.
