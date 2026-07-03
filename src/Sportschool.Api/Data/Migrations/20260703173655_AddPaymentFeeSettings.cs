using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sportschool.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentFeeSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DefaultMonthlyFee",
                table: "Schools",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentDayOfMonth",
                table: "Schools",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyFeeOverride",
                table: "AthleteProfiles",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultMonthlyFee",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "PaymentDayOfMonth",
                table: "Schools");

            migrationBuilder.DropColumn(
                name: "MonthlyFeeOverride",
                table: "AthleteProfiles");
        }
    }
}
