using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingSessionGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TrainingSessions_TrainingGroups_GroupId",
                table: "TrainingSessions");

            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_GroupId",
                table: "TrainingSessions");

            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_SchoolId_GroupId_StartsAt",
                table: "TrainingSessions");

            migrationBuilder.CreateTable(
                name: "TrainingSessionGroups",
                columns: table => new
                {
                    TrainingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingSessionGroups", x => new { x.TrainingSessionId, x.GroupId });
                    table.ForeignKey(
                        name: "FK_TrainingSessionGroups_TrainingGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "TrainingGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingSessionGroups_TrainingSessions_TrainingSessionId",
                        column: x => x.TrainingSessionId,
                        principalTable: "TrainingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_SchoolId_StartsAt",
                table: "TrainingSessions",
                columns: new[] { "SchoolId", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessionGroups_GroupId_TrainingSessionId",
                table: "TrainingSessionGroups",
                columns: new[] { "GroupId", "TrainingSessionId" });

            migrationBuilder.Sql(
                """
                INSERT INTO "TrainingSessionGroups" ("TrainingSessionId", "GroupId", "AddedAt")
                SELECT "Id", "GroupId", "CreatedAt"
                FROM "TrainingSessions"
                """);

            migrationBuilder.DropColumn(
                name: "GroupId",
                table: "TrainingSessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_SchoolId_StartsAt",
                table: "TrainingSessions");

            migrationBuilder.AddColumn<Guid>(
                name: "GroupId",
                table: "TrainingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "TrainingSessions" training
                SET "GroupId" = groups."GroupId"
                FROM (
                    SELECT DISTINCT ON ("TrainingSessionId") "TrainingSessionId", "GroupId"
                    FROM "TrainingSessionGroups"
                    ORDER BY "TrainingSessionId", "AddedAt", "GroupId"
                ) groups
                WHERE training."Id" = groups."TrainingSessionId"
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "GroupId",
                table: "TrainingSessions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropTable(
                name: "TrainingSessionGroups");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_GroupId",
                table: "TrainingSessions",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_SchoolId_GroupId_StartsAt",
                table: "TrainingSessions",
                columns: new[] { "SchoolId", "GroupId", "StartsAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_TrainingSessions_TrainingGroups_GroupId",
                table: "TrainingSessions",
                column: "GroupId",
                principalTable: "TrainingGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
