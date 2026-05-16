# Local Development

This project uses ASP.NET Core, EF Core, and PostgreSQL. Keep local setup boring and repeatable.

## Start PostgreSQL

```bash
docker compose up -d postgres
```

The default local connection string is already in `src/Sportschool.Api/appsettings.json`.

## Apply Migrations

```bash
dotnet ef database update \
  --project src/Sportschool.Api/Sportschool.Api.csproj \
  --startup-project src/Sportschool.Api/Sportschool.Api.csproj
```

## Run the API

```bash
dotnet run --project src/Sportschool.Api/Sportschool.Api.csproj
```

OpenAPI is available in Development at:

```text
/openapi/v1.json
```

## Create the First PlatformOwner

The bootstrap endpoint is only mapped in Development and Testing environments.

```bash
curl -X POST http://localhost:5000/api/bootstrap/platform-owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "fullName": "Platform Owner",
    "password": "change-me"
  }'
```

## Login as PlatformOwner

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "change-me",
    "mode": "PlatformOwner",
    "deviceName": "local"
  }'
```

Use the returned `accessToken` as a bearer token for platform endpoints.

## Create a School

```bash
curl -X POST http://localhost:5000/api/platform/schools \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Sports School",
    "code": "demo"
  }'
```

## Create a SchoolAdmin

```bash
curl -X POST http://localhost:5000/api/platform/schools/<schoolId>/admins \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "fullName": "School Admin"
  }'
```

The response includes a temporary password. There is no password-change flow yet, so treat this as a development bootstrap path for now.

## Verification

```bash
dotnet build Sportschool.slnx
dotnet test Sportschool.slnx --no-build
dotnet format Sportschool.slnx --verify-no-changes
```
