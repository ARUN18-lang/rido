const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const FARE_CONFIGS = [
  { vehicle_type: 'BIKE_TAXI', base_fare: 15, per_km_rate: 6, per_minute_rate: 0.8, min_fare: 20, cancellation_fee: 10, shared_discount_percent: 0, driver_shared_bonus_percent: 0, max_surge_multiplier: 1.5, per_stop_charge: 0, waiting_charge_per_min: 1 },
  { vehicle_type: 'AUTO', base_fare: 30, per_km_rate: 12, per_minute_rate: 1.5, min_fare: 40, cancellation_fee: 20, shared_discount_percent: 25, driver_shared_bonus_percent: 5, max_surge_multiplier: 1.8, per_stop_charge: 8, waiting_charge_per_min: 2 },
  { vehicle_type: 'MINI_CAR', base_fare: 40, per_km_rate: 14, per_minute_rate: 2, min_fare: 60, cancellation_fee: 30, shared_discount_percent: 30, driver_shared_bonus_percent: 5, max_surge_multiplier: 2.2, per_stop_charge: 8, waiting_charge_per_min: 2 },
  { vehicle_type: 'SEDAN', base_fare: 50, per_km_rate: 16, per_minute_rate: 2.5, min_fare: 80, cancellation_fee: 40, shared_discount_percent: 30, driver_shared_bonus_percent: 6, max_surge_multiplier: 2.2, per_stop_charge: 8, waiting_charge_per_min: 2 },
  { vehicle_type: 'SUV', base_fare: 70, per_km_rate: 20, per_minute_rate: 3, min_fare: 120, cancellation_fee: 50, shared_discount_percent: 35, driver_shared_bonus_percent: 7, max_surge_multiplier: 2.5, per_stop_charge: 8, waiting_charge_per_min: 2 },
  { vehicle_type: 'TEMPO', base_fare: 100, per_km_rate: 25, per_minute_rate: 3.5, min_fare: 200, cancellation_fee: 75, shared_discount_percent: 40, driver_shared_bonus_percent: 8, max_surge_multiplier: 2.0, per_stop_charge: 8, waiting_charge_per_min: 2 },
];

const MADURAI_ZONES = [
  {
    name: 'Madurai Central',
    district: 'Madurai',
    surge_multiplier: 1.2,
    polygon: {
      type: 'Polygon',
      coordinates: [[[78.10, 9.90], [78.16, 9.90], [78.16, 9.96], [78.10, 9.96], [78.10, 9.90]]],
    },
  },
  {
    name: 'Anna Nagar Madurai',
    district: 'Madurai',
    surge_multiplier: 1.0,
    polygon: {
      type: 'Polygon',
      coordinates: [[[78.11, 9.91], [78.14, 9.91], [78.14, 9.94], [78.11, 9.94], [78.11, 9.91]]],
    },
  },
  {
    name: 'Thirumangalam',
    district: 'Madurai',
    surge_multiplier: 1.1,
    polygon: {
      type: 'Polygon',
      coordinates: [[[77.90, 9.81], [77.96, 9.81], [77.96, 9.87], [77.90, 9.87], [77.90, 9.81]]],
    },
  },
];

async function main() {
  console.log('Seeding Rido database...');

  await prisma.vehicleFareConfig.deleteMany();
  for (const config of FARE_CONFIGS) {
    await prisma.vehicleFareConfig.create({ data: config });
  }

  await prisma.poolRevenueMultiplier.deleteMany();
  const multipliersToSeed = [];

  // BIKE_TAXI (max capacity 1)
  multipliersToSeed.push({
    vehicle_type: 'BIKE_TAXI',
    passenger_count: 1,
    revenue_multiplier: 1.0,
    discount_percent: 0.0,
    is_active: true,
  });

  // AUTO (capacity 3)
  multipliersToSeed.push({
    vehicle_type: 'AUTO',
    passenger_count: 2,
    revenue_multiplier: 1.20,
    discount_percent: Number(((1 - (1.20 / 2)) * 100).toFixed(2)),
    is_active: true,
  });
  multipliersToSeed.push({
    vehicle_type: 'AUTO',
    passenger_count: 3,
    revenue_multiplier: 1.50,
    discount_percent: Number(((1 - (1.50 / 3)) * 100).toFixed(2)),
    is_active: true,
  });

  // MINI_CAR & SEDAN (capacity 4)
  for (const vt of ['MINI_CAR', 'SEDAN']) {
    multipliersToSeed.push({
      vehicle_type: vt,
      passenger_count: 2,
      revenue_multiplier: 1.20,
      discount_percent: Number(((1 - (1.20 / 2)) * 100).toFixed(2)),
      is_active: true,
    });
    multipliersToSeed.push({
      vehicle_type: vt,
      passenger_count: 3,
      revenue_multiplier: 1.45,
      discount_percent: Number(((1 - (1.45 / 3)) * 100).toFixed(2)),
      is_active: true,
    });
    multipliersToSeed.push({
      vehicle_type: vt,
      passenger_count: 4,
      revenue_multiplier: 1.65,
      discount_percent: Number(((1 - (1.65 / 4)) * 100).toFixed(2)),
      is_active: true,
    });
  }

  // SUV (capacity 6)
  const suvMults = { 2: 1.15, 3: 1.40, 4: 1.60, 5: 1.75, 6: 1.85 };
  for (const [n, m] of Object.entries(suvMults)) {
    const passengerCount = parseInt(n, 10);
    multipliersToSeed.push({
      vehicle_type: 'SUV',
      passenger_count: passengerCount,
      revenue_multiplier: m,
      discount_percent: Number(((1 - (m / passengerCount)) * 100).toFixed(2)),
      is_active: true,
    });
  }

  // TEMPO (capacity 8)
  for (let n = 2; n <= 8; n++) {
    const mRaw = 1 + (n - 1) * 0.18 * (1 - (n - 1) * 0.04);
    const m = Math.round(mRaw * 100) / 100;
    multipliersToSeed.push({
      vehicle_type: 'TEMPO',
      passenger_count: n,
      revenue_multiplier: m,
      discount_percent: Number(((1 - (m / n)) * 100).toFixed(2)),
      is_active: true,
    });
  }

  for (const data of multipliersToSeed) {
    await prisma.poolRevenueMultiplier.create({ data });
  }

  const admin = await prisma.user.upsert({
    where: { phone: '+919876543210' },
    update: { role: 'ADMIN', name: 'Rido Admin' },
    create: {
      phone: '+919876543210',
      name: 'Rido Admin',
      role: 'ADMIN',
      is_phone_verified: true,
      gender: 'OTHER',
    },
  });

  const riders = [];
  for (let i = 1; i <= 5; i++) {
    const rider = await prisma.user.upsert({
      where: { phone: `+91980000000${i}` },
      update: {},
      create: {
        phone: `+91980000000${i}`,
        name: `Rider ${i}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        is_phone_verified: true,
        preferred_language: 'ta',
      },
    });
    riders.push(rider);
  }

  for (let i = 1; i <= 2; i++) {
    const driverUser = await prisma.user.upsert({
      where: { phone: `+91970000000${i}` },
      update: { role: 'DRIVER' },
      create: {
        phone: `+91970000000${i}`,
        name: `Driver ${i}`,
        gender: i === 2 ? 'FEMALE' : 'MALE',
        role: 'DRIVER',
        is_phone_verified: true,
      },
    });

    const driver = await prisma.driver.upsert({
      where: { user_id: driverUser.id },
      update: { kyc_status: 'APPROVED' },
      create: {
        user_id: driverUser.id,
        kyc_status: 'APPROVED',
        status: 'OFFLINE',
        is_female_verified: i === 2,
        is_women_ride_enabled: i === 2,
        current_lat: 9.9252,
        current_lng: 78.1198,
      },
    });

    const vehicle = await prisma.vehicle.upsert({
      where: { registration_number: `TN58AB${1000 + i}` },
      update: {},
      create: {
        driver_id: driver.id,
        type: i === 1 ? 'AUTO' : 'SEDAN',
        make: i === 1 ? 'Bajaj' : 'Maruti',
        model: i === 1 ? 'RE Compact' : 'Swift',
        year: 2022,
        color: i === 1 ? 'Yellow' : 'White',
        registration_number: `TN58AB${1000 + i}`,
        max_passengers: i === 1 ? 3 : 4,
        is_active: true,
      },
    });

    const docTypes = ['AADHAAR', 'DRIVING_LICENSE', 'VEHICLE_RC', 'VEHICLE_INSURANCE'];
    for (const docType of docTypes) {
      const existing = await prisma.driverDocument.findFirst({
        where: { driver_id: driver.id, document_type: docType },
      });
      if (!existing) {
        await prisma.driverDocument.create({
          data: {
            driver_id: driver.id,
            document_type: docType,
            file_url: `https://example.com/docs/${driver.id}/${docType}.pdf`,
            verified: true,
          },
        });
      }
    }
  }

  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
    for (const zone of MADURAI_ZONES) {
      const geoJson = JSON.stringify(zone.polygon);
      await prisma.$executeRaw`
        INSERT INTO zones (id, name, district, state, polygon, surge_multiplier, is_active, created_at)
        SELECT gen_random_uuid(), ${zone.name}, ${zone.district}, 'Tamil Nadu',
          ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326),
          ${zone.surge_multiplier}, true, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = ${zone.name})
      `;
    }
  } catch (err) {
    console.warn('PostGIS zones skipped:', err.message);
  }

  console.log('Seed complete:', { admin: admin.phone, riders: riders.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
