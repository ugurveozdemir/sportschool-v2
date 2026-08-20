# syntax=docker/dockerfile:1

# --- Stage 1: build the React dashboard into the API's dashboard directory ---
FROM node:24-alpine AS dashboard-build
WORKDIR /src/Sportschool.Dashboard
COPY src/Sportschool.Dashboard/package*.json ./
RUN npm ci
COPY src/Sportschool.Dashboard/ ./
RUN npm run build

# --- Stage 2: restore + publish the API (includes the built dashboard) ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY src/Sportschool.Api/Sportschool.Api.csproj src/Sportschool.Api/
RUN dotnet restore src/Sportschool.Api/Sportschool.Api.csproj
COPY src/Sportschool.Api/ src/Sportschool.Api/
COPY --from=dashboard-build /src/Sportschool.Api/wwwroot/dashboard src/Sportschool.Api/wwwroot/dashboard
RUN dotnet publish src/Sportschool.Api/Sportschool.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# --- Stage 3: runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/publish ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/AppData/Media \
    && chown -R app:app /app
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Sportschool.Api.dll"]
