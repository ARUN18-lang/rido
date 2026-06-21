#!/bin/sh

# Exit immediately if any command fails
set -e

echo "=== Rido Backend Container Booting ==="

# Wait loop for PostgreSQL readiness
until pg_isready -h postgres -p 5432; do
  echo "Waiting for PostgreSQL at postgres:5432 to accept connections..."
  sleep 1
done

echo "PostgreSQL is ready!"

# Run Prisma migrations to deploy changes to the PostgreSQL container
echo "Running database migrations..."
npx prisma migrate deploy

# Idempotency check: only seed if the admin user is not found in the database
echo "Checking database seed status..."
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { phone: "+919876543210" } })
  .then(user => {
    if (user) {
      console.log("Admin user found. Database is already seeded.");
      process.exit(0);
    } else {
      console.log("Admin user not found. Database is empty/unseeded.");
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("Failed to query users table:", err.message);
    process.exit(1); // default to seeding if database query fails
  });
' && SEED_NEEDED=0 || SEED_NEEDED=1

if [ "$SEED_NEEDED" -eq 1 ]; then
  echo "Seeding database..."
  node prisma/seed.js
  echo "Database seeded successfully!"
else
  echo "Database is already seeded. Skipping seed step."
fi

# Hand over process execution to the CMD defined in Dockerfile/docker-compose
echo "Starting application server..."
exec "$@"
