# Sportschool

Sportschool is a B2B operations backend for sports schools. The application is multi-tenant: each school is isolated as its own tenant, and users can only access data that belongs to their school.

The first goal is a small, production-oriented ASP.NET Core API with PostgreSQL, EF Core, JWT authentication, refresh tokens, and focused tests for tenant isolation and critical business rules.

## Development seed credentials

Development passwords are not stored in source control. To seed local accounts with Docker Compose, copy `.env.example` to `.env`, set the three `DEV_SEED_*_PASSWORD` values, and set `DEV_SEED_ENABLED=true`.

Production must provide `ConnectionStrings__DefaultConnection` and `Jwt__SigningKey` through the deployment environment.
