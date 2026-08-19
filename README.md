# Sportschool

Sportschool is a B2B operations backend for sports schools. The application is multi-tenant: each school is isolated as its own tenant, and users can only access data that belongs to their school.

The first goal is a small, production-oriented ASP.NET Core API with PostgreSQL, EF Core, JWT authentication, refresh tokens, and focused tests for tenant isolation and critical business rules.

## Development seed credentials

Development passwords are not stored in source control. To seed local accounts with Docker Compose, copy `.env.example` to `.env`, set the three `DEV_SEED_*_PASSWORD` values, and set `DEV_SEED_ENABLED=true`.

Production must provide `ConnectionStrings__DefaultConnection` and `Jwt__SigningKey` through the deployment environment.

## Production database migrations

Production startup does not change the database schema. After taking a verified backup, run migrations as a one-off deployment command before starting the API:

```bash
dotnet Sportschool.Api.dll --migrate
```

The command exits after applying migrations. `/api/health/ready` returns `503` while PostgreSQL has pending migrations.

## Production PlatformOwner maintenance

Production does not expose the development bootstrap endpoint. After migrations, provision the first PlatformOwner with deployment secrets:

```bash
Provisioning__PlatformOwner__Email=owner@example.com \
Provisioning__PlatformOwner__FullName="Platform Owner" \
Provisioning__PlatformOwner__Password="replace-with-a-secret" \
dotnet Sportschool.Api.dll --provision-platform-owner
```

If the PlatformOwner password is lost, reset it with the maintenance command below. It also revokes all active refresh tokens for that account:

```bash
Provisioning__PlatformOwner__Email=owner@example.com \
Provisioning__PlatformOwner__Password="replace-with-a-new-secret" \
dotnet Sportschool.Api.dll --reset-platform-owner-password
```

Supply these values through the deployment platform's secret mechanism. Do not store production passwords in source control or pass them as command-line arguments.
