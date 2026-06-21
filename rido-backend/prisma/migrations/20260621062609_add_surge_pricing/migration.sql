-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SPORTS', 'CONCERT', 'FESTIVAL', 'RELIGIOUS', 'OTHER');

-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'BIKE_TAXI';

-- AlterTable
ALTER TABLE "vehicle_fare_configs" ADD COLUMN     "detour_rate_per_km" DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN     "detour_rate_per_min" DECIMAL(10,2) DEFAULT 0.0,
ADD COLUMN     "max_surge_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 2.0,
ADD COLUMN     "per_stop_charge" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
ADD COLUMN     "waiting_charge_per_min" DECIMAL(10,2) NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "pool_revenue_multipliers" (
    "id" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "passenger_count" INTEGER NOT NULL,
    "revenue_multiplier" DECIMAL(4,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pool_revenue_multipliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surge_zone_snapshots" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "demand_count" INTEGER NOT NULL,
    "supply_count" INTEGER NOT NULL,
    "demand_supply_ratio" DECIMAL(8,4) NOT NULL,
    "weather_severity" DECIMAL(3,2) NOT NULL,
    "traffic_congestion_index" DECIMAL(5,4) NOT NULL,
    "event_boost" DECIMAL(3,2) NOT NULL,
    "surge_score" DECIMAL(5,4) NOT NULL,
    "surge_multiplier" DECIMAL(4,2) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surge_zone_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_boost_configs" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "boost_peak_value" DECIMAL(3,2) NOT NULL,
    "decay_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_boost_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_pool_fare_breakdowns" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "pool_id" TEXT,
    "vehicle_type" "VehicleType" NOT NULL,
    "passenger_count" INTEGER NOT NULL,
    "solo_base_fare" DECIMAL(10,2) NOT NULL,
    "surge_multiplier" DECIMAL(4,2) NOT NULL,
    "revenue_multiplier_applied" DECIMAL(4,2) NOT NULL,
    "total_pool_fare" DECIMAL(10,2) NOT NULL,
    "raw_per_rider_share" DECIMAL(10,2) NOT NULL,
    "detour_distance_km" DECIMAL(8,3) NOT NULL DEFAULT 0.0,
    "detour_duration_min" DECIMAL(8,2) NOT NULL DEFAULT 0.0,
    "detour_buffer_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "stop_charge" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "waiting_charge" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "final_fare" DECIMAL(10,2) NOT NULL,
    "was_capped_to_solo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_pool_fare_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pool_revenue_multipliers_vehicle_type_passenger_count_key" ON "pool_revenue_multipliers"("vehicle_type", "passenger_count");

-- CreateIndex
CREATE UNIQUE INDEX "ride_pool_fare_breakdowns_ride_id_key" ON "ride_pool_fare_breakdowns"("ride_id");

-- AddForeignKey
ALTER TABLE "surge_zone_snapshots" ADD CONSTRAINT "surge_zone_snapshots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_boost_configs" ADD CONSTRAINT "event_boost_configs_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_pool_fare_breakdowns" ADD CONSTRAINT "ride_pool_fare_breakdowns_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_pool_fare_breakdowns" ADD CONSTRAINT "ride_pool_fare_breakdowns_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "ride_pools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
