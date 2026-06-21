/*
  Warnings:

  - Added the required column `vehicle_type` to the `surge_zone_snapshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "surge_zone_snapshots" ADD COLUMN     "vehicle_type" "VehicleType" NOT NULL;
