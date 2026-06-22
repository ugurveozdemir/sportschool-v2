# Changelog

## 2026-06-23

- Replaced the auto-generated temporary password when a PlatformOwner creates a school admin with a required password the owner chooses (minimum 8 characters).
- Added a PlatformOwner endpoint to change a school admin's password at any time, which revokes the admin's active refresh tokens so open sessions must re-authenticate.
- Added a dashboard "Şifre değiştir" action per school admin and a password field to the create-admin dialog, removing the one-time temporary-password panel.

## 2026-06-01

- Added parent-linked athlete selection for mobile member reads and fixed parent access to athlete reports.
- Added announcement publishing APIs for Coach/SchoolAdmin users, with school isolation, optional expiry, seven-day new status, and coach-owned edit restrictions.
- Added parent/athlete announcement reading APIs that can return all active announcements or only current non-expired announcements.
- Added mobile announcement list and publishing UI, wired parent home announcements to live API data, and linked notification/quick-action entry points to the new page.

## 2026-05-29

- Changed training sessions from a single group relationship to a multi-group join model with data-preserving migration.
- Updated training, attendance, dashboard, parent/athlete mobile, and coach mobile backend endpoints to read training groups through `TrainingSessionGroups`.
- Added API tests for multi-group training creation and distinct coach roster athletes across multiple groups.
- Added coach mobile training detail navigation from the calendar, showing training notes, linked groups, and roster athletes without attendance status.
- Made the coach mobile home screen's today-training card open the same training detail screen as the calendar card.
- Removed the hard-coded coach home match card and listed every training returned for the current day.
- Showed each training's saved title on the coach mobile home screen instead of forcing a generic training label.
- Added training notes to coach mobile training summaries and displayed them under each home-screen training title.
- Added multi-select group checkboxes for coach mobile training creation and editing, with detail-screen edit support for core training fields.
- Restricted coach training update/delete authorization to the owning coach while keeping SchoolAdmin school-wide access.

## 2026-05-24

- Changed the Development PlatformOwner seed to `ugur@gmail.com` / `123123`.
- Updated the Development seed behavior so the configured PlatformOwner email is created when missing, even if an older PlatformOwner already exists locally.
- Clarified PlatformOwner login behavior in the dashboard auth screen by clearing school selection and showing a role-specific login failure message.
- Added explicit test coverage for PlatformOwner login with `schoolCode: null`.
- Added active-school selection to the auth screen through a public login-school list endpoint, and allowed PlatformOwner login without a school selection.
- Restored PlatformOwner dashboard access to the platform operations screen while keeping Coach/SchoolAdmin on the school workflow navigation.
- Fixed the dashboard auth route so the login screen is outside the protected app layout and appears when no staff session exists.
- Reworked the auth UI into a dedicated Coach/SchoolAdmin login screen and refreshed the built dashboard assets.
- Converted the dashboard from an API testing panel into a Coach/SchoolAdmin product workflow for daily school operations.
- Added staff dashboard summary, date-range training list, group athlete roster, attendance roster, and monthly payment overview endpoints without adding migrations.
- Allowed Coach users to update existing attendance records, matching the new correction workflow.
- Reworked dashboard routing, navigation, auth, account, home, trainings, attendance, athletes, groups, payments, and reports screens around selected records instead of manual IDs.
- Added product endpoint tests for staff authorization, tenant isolation, attendance correction, and monthly payment rows for athletes without payment records.

## 2026-05-16

- Completed the remaining dashboard MVP sections for Health, Platform, School, Applications, Athletes, Groups, Trainings, Attendance, Payments, Reports, and Me.
- Added shared dashboard domain types, endpoint constants, data table, and status badge components so feature pages do not duplicate endpoint strings or table markup.
- Fixed dashboard session snapshot caching so React `useSyncExternalStore` does not enter a maximum update depth loop on Auth routes.
- Added Development-only auth seed for a default PlatformOwner user so the dashboard Auth screen can be tested immediately after migrations.
- Documented the local seeded PlatformOwner credentials in `docs/local-development.md`.
- Added the initial React/Vite Sportschool dashboard app under `src/Sportschool.Dashboard`.
- Added the dashboard foundation: Turkish layout, sidebar/topbar navigation, shared API client, session storage, response inspector, and Auth operations screen.
- Added Auth UI for PlatformOwner bootstrap, login, token refresh/logout summary, and password change against the existing API endpoints.
- Added ASP.NET Core static file/fallback hosting for `/dashboard` so the React build can be served by the API in production.
- Kept generated dashboard build assets and frontend dependencies out of git through `.gitignore`.
- Moved local PostgreSQL host port to `5433` for the `sportschool-v2` container so older local containers can keep using `5432`.
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

- Decide whether weekly training recurrence should remain a stored template or expand into dated occurrences before calendar UI work.

# Notes

- Keep `README.md` product-facing only; ongoing implementation notes belong here.
- User email uniqueness is tenant-scoped through `SchoolId + NormalizedEmail`; platform-owner emails are globally unique where `SchoolId` is null.
- Refresh tokens are stored as hashes and rotate per device session; refreshing one device does not revoke other devices.
- The first PlatformOwner is created through `/api/bootstrap/platform-owner` only in Development.
- Athlete approval creates one AppUser with both Athlete and Parent roles; parent details live on AthleteProfile for now.
- Training recurrence is currently stored as `None` or `Weekly`; recurrence expansion into concrete calendar occurrences is not implemented yet.
- Dashboard source lives in `src/Sportschool.Dashboard`; local development uses Vite, production serving uses the API `/dashboard` fallback after `npm run build`.
- Local Development seeds `ugur@gmail.com` / `123123` as PlatformOwner when that configured PlatformOwner email is missing and `DevSeed:Enabled` is true.
