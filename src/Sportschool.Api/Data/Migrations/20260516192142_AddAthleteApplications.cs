using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAthleteApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AthleteApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteFirstName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    AthleteLastName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    AthleteBirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    AthleteEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    NormalizedAthleteEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ParentFullName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ParentPhone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DecidedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ApprovedUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AthleteApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AthleteApplications_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AthleteApplications_Users_ApprovedUserId",
                        column: x => x.ApprovedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AthleteProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    LastName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ParentFullName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    ParentPhone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AthleteProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AthleteProfiles_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AthleteProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteApplications_ApprovedUserId",
                table: "AthleteApplications",
                column: "ApprovedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AthleteApplications_SchoolId_NormalizedAthleteEmail_Status",
                table: "AthleteApplications",
                columns: new[] { "SchoolId", "NormalizedAthleteEmail", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteProfiles_SchoolId_UserId",
                table: "AthleteProfiles",
                columns: new[] { "SchoolId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AthleteProfiles_UserId",
                table: "AthleteProfiles",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AthleteApplications");

            migrationBuilder.DropTable(
                name: "AthleteProfiles");
        }
    }
}
