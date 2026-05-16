# Changelog

## 2026-05-16

- Initialized the backend solution with an ASP.NET Core API project and xUnit test project.
- Added PostgreSQL local development wiring through Docker Compose and EF Core's Npgsql provider.
- Replaced the template weather endpoint with a small `/api/health` endpoint and a matching integration test.

# Todo

- Define the first domain entities for schools, users, roles, and tenant isolation.
- Add JWT and refresh token authentication.
- Add tenant isolation tests before building feature endpoints.

# Notes

- Keep `README.md` product-facing only; ongoing implementation notes belong here.
