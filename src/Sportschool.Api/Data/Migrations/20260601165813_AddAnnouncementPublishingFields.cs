using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAnnouncementPublishingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Announcements_SchoolId_IsActive_CreatedAt",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "TargetRole",
                table: "Announcements");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Announcements",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "Announcements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublishedAt",
                table: "Announcements",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("UPDATE \"Announcements\" SET \"PublishedAt\" = \"CreatedAt\" WHERE \"PublishedAt\" IS NULL;");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "PublishedAt",
                table: "Announcements",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_CreatedByUserId",
                table: "Announcements",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_SchoolId_IsActive_PublishedAt",
                table: "Announcements",
                columns: new[] { "SchoolId", "IsActive", "PublishedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_Users_CreatedByUserId",
                table: "Announcements",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_Users_CreatedByUserId",
                table: "Announcements");

            migrationBuilder.DropIndex(
                name: "IX_Announcements_CreatedByUserId",
                table: "Announcements");

            migrationBuilder.DropIndex(
                name: "IX_Announcements_SchoolId_IsActive_PublishedAt",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "Announcements");

            migrationBuilder.AddColumn<string>(
                name: "TargetRole",
                table: "Announcements",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_SchoolId_IsActive_CreatedAt",
                table: "Announcements",
                columns: new[] { "SchoolId", "IsActive", "CreatedAt" });
        }
    }
}
