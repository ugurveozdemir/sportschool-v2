using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StudentPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    PaidOn = table.Column<DateOnly>(type: "date", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentPayments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentPayments_AthleteProfiles_AthleteProfileId",
                        column: x => x.AthleteProfileId,
                        principalTable: "AthleteProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentPayments_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentPayments_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentPayments_AthleteProfileId",
                table: "StudentPayments",
                column: "AthleteProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentPayments_SchoolId_AthleteProfileId_Year_Month",
                table: "StudentPayments",
                columns: new[] { "SchoolId", "AthleteProfileId", "Year", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentPayments_UpdatedByUserId",
                table: "StudentPayments",
                column: "UpdatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StudentPayments");
        }
    }
}
