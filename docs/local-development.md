# Local Development

This project uses ASP.NET Core, EF Core, and PostgreSQL. Keep local setup boring and repeatable.

## Start PostgreSQL

```bash
docker compose up -d postgres
```

The default local connection string is already in `src/Sportschool.Api/appsettings.json`.
The local PostgreSQL host port is `5433` so this repo can run next to older local PostgreSQL containers using `5432`.

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

Development ortamında API açılırken aşağıdaki PlatformOwner kullanıcı yoksa otomatik oluşturulur.

```text
email: ugur@gmail.com
password: 123123
mode: PlatformOwner
```

OpenAPI is available in Development at:

```text
/openapi/v1.json
```

## Create the First PlatformOwner Manually

The bootstrap endpoint is only mapped in Development and Testing environments.
Normal local development için buna gerek yoktur; Development seed aynı kullanıcıyı otomatik oluşturur.

```bash
curl -X POST http://localhost:5000/api/bootstrap/platform-owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ugur@gmail.com",
    "fullName": "Platform Owner",
    "password": "123123"
  }'
```

## Login as PlatformOwner

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ugur@gmail.com",
    "password": "123123",
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

The response includes a temporary password. Use `/api/auth/change-password` after the first login to replace it.

## Verification

```bash
dotnet build Sportschool.slnx
dotnet test Sportschool.slnx --no-build
dotnet format Sportschool.slnx --verify-no-changes
```
