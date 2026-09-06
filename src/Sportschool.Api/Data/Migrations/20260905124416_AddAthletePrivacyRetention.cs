using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAthletePrivacyRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeactivatedAt",
                table: "AthleteProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PersonalDataDeletedAt",
                table: "AthleteProfiles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "AthleteProfiles"
                SET "DeactivatedAt" = NOW()
                WHERE "IsActive" = FALSE AND "DeactivatedAt" IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_AthleteProfiles_IsActive_DeactivatedAt_PersonalDataDeletedAt",
                table: "AthleteProfiles",
                columns: new[] { "IsActive", "DeactivatedAt", "PersonalDataDeletedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AthleteProfiles_IsActive_DeactivatedAt_PersonalDataDeletedAt",
                table: "AthleteProfiles");

            migrationBuilder.DropColumn(
                name: "DeactivatedAt",
                table: "AthleteProfiles");

            migrationBuilder.DropColumn(
                name: "PersonalDataDeletedAt",
                table: "AthleteProfiles");
        }
    }
}
