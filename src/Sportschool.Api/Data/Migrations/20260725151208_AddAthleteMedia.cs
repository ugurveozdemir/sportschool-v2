using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAthleteMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileImageStorageKey",
                table: "AthleteProfiles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AthleteVideos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Caption = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Status = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AthleteVideos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AthleteVideos_AthleteProfiles_AthleteProfileId",
                        column: x => x.AthleteProfileId,
                        principalTable: "AthleteProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AthleteVideos_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AthleteVideos_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteVideos_AthleteProfileId_CreatedAt",
                table: "AthleteVideos",
                columns: new[] { "AthleteProfileId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteVideos_SchoolId_IsActive_IsPublished_PublishedAt",
                table: "AthleteVideos",
                columns: new[] { "SchoolId", "IsActive", "IsPublished", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AthleteVideos_UploadedByUserId",
                table: "AthleteVideos",
                column: "UploadedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AthleteVideos");

            migrationBuilder.DropColumn(
                name: "ProfileImageStorageKey",
                table: "AthleteProfiles");
        }
    }
}
