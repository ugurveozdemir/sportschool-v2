# Sportschool

Sportschool is a B2B operations backend for sports schools. The application is multi-tenant: each school is isolated as its own tenant, and users can only access data that belongs to their school.

The first goal is a small, production-oriented ASP.NET Core API with PostgreSQL, EF Core, JWT authentication, refresh tokens, and focused tests for tenant isolation and critical business rules.

## Development seed credentials

Development passwords are not stored in source control. To seed local accounts with Docker Compose, copy `.env.example` to `.env`, set the three `DEV_SEED_*_PASSWORD` values, and set `DEV_SEED_ENABLED=true`.

Production must provide `ConnectionStrings__DefaultConnection` and `Jwt__SigningKey` through the deployment environment.

## Local Mux Video setup

Video uploads use Mux Direct Uploads, verified webhooks, and signed playback URLs. Keep all Mux credentials outside source control.

Create a Mux access token with Video read/write access and a URL signing key. The signing private key is returned only once and must remain base64 encoded. Store the local values with .NET user secrets:

```bash
dotnet user-secrets set "Mux:Enabled" "true" --project src/Sportschool.Api/Sportschool.Api.csproj
dotnet user-secrets set "Mux:TokenId" "YOUR_TOKEN_ID" --project src/Sportschool.Api/Sportschool.Api.csproj
dotnet user-secrets set "Mux:TokenSecret" "YOUR_TOKEN_SECRET" --project src/Sportschool.Api/Sportschool.Api.csproj
dotnet user-secrets set "Mux:PlaybackSigningKeyId" "YOUR_SIGNING_KEY_ID" --project src/Sportschool.Api/Sportschool.Api.csproj
dotnet user-secrets set "Mux:PlaybackSigningPrivateKey" "YOUR_BASE64_PRIVATE_KEY" --project src/Sportschool.Api/Sportschool.Api.csproj
dotnet user-secrets set "Mux:UploadOrigin" "http://localhost:5173" --project src/Sportschool.Api/Sportschool.Api.csproj
```

The API expects Mux webhook events at `/api/webhooks/mux`. For local development, authenticate the Mux CLI and forward events to the API:

```bash
npx @mux/cli login
npx @mux/cli webhooks listen --forward-to http://localhost:5062/api/webhooks/mux
```

The listener prints a webhook signing secret. Store it before starting the API:

```bash
dotnet user-secrets set "Mux:WebhookSigningSecret" "SECRET_PRINTED_BY_MUX_CLI" --project src/Sportschool.Api/Sportschool.Api.csproj
```

When running the dashboard from the API instead of Vite, change `Mux:UploadOrigin` to `http://localhost:5062`. Docker Compose reads the equivalent `MUX_*` values from the ignored `.env` file.

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
