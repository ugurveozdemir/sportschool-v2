using Microsoft.EntityFrameworkCore;

namespace Sportschool.Api.Data;

public sealed class SportschoolDbContext(DbContextOptions<SportschoolDbContext> options)
    : DbContext(options);
