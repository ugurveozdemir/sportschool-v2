using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class IntegrateMuxVideo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "StorageKey",
                table: "AthleteVideos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AddColumn<string>(
                name: "MuxAssetId",
                table: "AthleteVideos",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MuxPlaybackId",
                table: "AthleteVideos",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MuxUploadId",
                table: "AthleteVideos",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MuxAssetId",
                table: "AthleteVideos");

            migrationBuilder.DropColumn(
                name: "MuxPlaybackId",
                table: "AthleteVideos");

            migrationBuilder.DropColumn(
                name: "MuxUploadId",
                table: "AthleteVideos");

            migrationBuilder.AlterColumn<string>(
                name: "StorageKey",
                table: "AthleteVideos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);
        }
    }
}
