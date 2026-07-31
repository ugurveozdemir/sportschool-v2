using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainingLifecycleAndReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"AttendanceRecords\" SET \"Status\" = 'Present' WHERE \"Status\" = 'Late'");
            migrationBuilder.Sql("UPDATE \"AttendanceRecords\" SET \"Status\" = 'Absent' WHERE \"Status\" = 'Excused'");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CompletedAt",
                table: "TrainingSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CompletedByUserId",
                table: "TrainingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "StartedAt",
                table: "TrainingSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StartedByUserId",
                table: "TrainingSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AttendanceRecords",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40);

            migrationBuilder.AlterColumn<Guid>(
                name: "RecordedByUserId",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "RecordedAt",
                table: "AttendanceRecords",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<Guid>(
                name: "TrainingSessionId",
                table: "Announcements",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TrainingAthleteReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SchoolId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrainingSessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    AthleteProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoachId = table.Column<Guid>(type: "uuid", nullable: false),
                    NutritionScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CognitiveDevelopmentScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    DisciplineScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    PhysicalConditionScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    PsychologicalDevelopmentScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    TacticalDevelopmentScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    TechnicalDevelopmentScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    CoachNote = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainingAthleteReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainingAthleteReports_AthleteProfiles_AthleteProfileId",
                        column: x => x.AthleteProfileId,
                        principalTable: "AthleteProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAthleteReports_Schools_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "Schools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAthleteReports_TrainingSessions_TrainingSessionId",
                        column: x => x.TrainingSessionId,
                        principalTable: "TrainingSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TrainingAthleteReports_Users_CoachId",
                        column: x => x.CoachId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_CompletedByUserId",
                table: "TrainingSessions",
                column: "CompletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_SchoolId_StartedAt",
                table: "TrainingSessions",
                columns: new[] { "SchoolId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingSessions_StartedByUserId",
                table: "TrainingSessions",
                column: "StartedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_TrainingSessionId",
                table: "Announcements",
                column: "TrainingSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAthleteReports_AthleteProfileId",
                table: "TrainingAthleteReports",
                column: "AthleteProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAthleteReports_CoachId",
                table: "TrainingAthleteReports",
                column: "CoachId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAthleteReports_SchoolId_AthleteProfileId_CreatedAt",
                table: "TrainingAthleteReports",
                columns: new[] { "SchoolId", "AthleteProfileId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainingAthleteReports_TrainingSessionId_AthleteProfileId",
                table: "TrainingAthleteReports",
                columns: new[] { "TrainingSessionId", "AthleteProfileId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Announcements_TrainingSessions_TrainingSessionId",
                table: "Announcements",
                column: "TrainingSessionId",
                principalTable: "TrainingSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TrainingSessions_Users_CompletedByUserId",
                table: "TrainingSessions",
                column: "CompletedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TrainingSessions_Users_StartedByUserId",
                table: "TrainingSessions",
                column: "StartedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Announcements_TrainingSessions_TrainingSessionId",
                table: "Announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_TrainingSessions_Users_CompletedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropForeignKey(
                name: "FK_TrainingSessions_Users_StartedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropTable(
                name: "TrainingAthleteReports");

            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_CompletedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_SchoolId_StartedAt",
                table: "TrainingSessions");

            migrationBuilder.DropIndex(
                name: "IX_TrainingSessions_StartedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropIndex(
                name: "IX_Announcements_TrainingSessionId",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "TrainingSessions");

            migrationBuilder.DropColumn(
                name: "CompletedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "TrainingSessions");

            migrationBuilder.DropColumn(
                name: "StartedByUserId",
                table: "TrainingSessions");

            migrationBuilder.DropColumn(
                name: "TrainingSessionId",
                table: "Announcements");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AttendanceRecords",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(40)",
                oldMaxLength: 40,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RecordedByUserId",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "RecordedAt",
                table: "AttendanceRecords",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)),
                oldClrType: typeof(DateTimeOffset),
                oldType: "timestamp with time zone",
                oldNullable: true);
        }
    }
}
