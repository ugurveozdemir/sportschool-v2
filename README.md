# Sportschool

Sportschool is a B2B operations backend for sports schools. The application is multi-tenant: each school is isolated as its own tenant, and users can only access data that belongs to their school.

The first goal is a small, production-oriented ASP.NET Core API with PostgreSQL, EF Core, JWT authentication, refresh tokens, and focused tests for tenant isolation and critical business rules.
