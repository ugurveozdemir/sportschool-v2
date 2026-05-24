using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddParentRelationshipAnnouncementsAndMatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentUserId",
                table: "AthleteProfiles",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedParentEmail",
                table: "AthleteApplications",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ParentEmail",
                table: "AthleteApplications",
                type: "character varying(320)",
                maxLength: 320,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    TargetRole = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Announcements_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AthleteMeasurements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Height = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Weight = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    RecordedAt = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AthleteMeasurements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AthleteMeasurements_AthleteProfiles_AthleteProfileId",
                        column: x => x.AthleteProfileId,
                        principalTable: "AthleteProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MatchSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    OpponentTeamName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    MatchDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Location = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchSessions_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MatchSquads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchSquads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchSquads_AthleteProfiles_AthleteProfileId",
                        column: x => x.AthleteProfileId,
                        principalTable: "AthleteProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MatchSquads_MatchSessions_MatchSessionId",
                        column: x => x.MatchSessionId,
                        principalTable: "MatchSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteProfiles_ParentUserId",
                table: "AthleteProfiles",
                column: "ParentUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_SchoolId_IsActive_CreatedAt",
                table: "Announcements",
                columns: new[] { "SchoolId", "IsActive", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteMeasurements_AthleteProfileId_RecordedAt",
                table: "AthleteMeasurements",
                columns: new[] { "AthleteProfileId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchSessions_SchoolId_IsActive_MatchDate",
                table: "MatchSessions",
                columns: new[] { "SchoolId", "IsActive", "MatchDate" });

            migrationBuilder.CreateIndex(
                name: "IX_MatchSquads_AthleteProfileId",
                table: "MatchSquads",
                column: "AthleteProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchSquads_MatchSessionId_AthleteProfileId",
                table: "MatchSquads",
                columns: new[] { "MatchSessionId", "AthleteProfileId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AthleteProfiles_Users_ParentUserId",
                table: "AthleteProfiles",
                column: "ParentUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AthleteProfiles_Users_ParentUserId",
                table: "AthleteProfiles");

            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "AthleteMeasurements");

            migrationBuilder.DropTable(
                name: "MatchSquads");

            migrationBuilder.DropTable(
                name: "MatchSessions");

            migrationBuilder.DropIndex(
                name: "IX_AthleteProfiles_ParentUserId",
                table: "AthleteProfiles");

            migrationBuilder.DropColumn(
                name: "ParentUserId",
                table: "AthleteProfiles");

            migrationBuilder.DropColumn(
                name: "NormalizedParentEmail",
                table: "AthleteApplications");

            migrationBuilder.DropColumn(
                name: "ParentEmail",
                table: "AthleteApplications");
        }
    }
}
