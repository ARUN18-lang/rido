const prisma = require('../../utils/prisma');
const { NotFoundError } = require('../../utils/errors');

async function listZones() {
  return prisma.$queryRaw`
    SELECT id, name, district, state, surge_multiplier, is_active, created_at
    FROM zones
    ORDER BY created_at DESC
  `;
}

async function createZone({ name, district, polygon, surge_multiplier = 1.0 }) {
  const geoJson = JSON.stringify(polygon);
  const result = await prisma.$queryRaw`
    INSERT INTO zones (id, name, district, state, polygon, surge_multiplier, is_active, created_at)
    VALUES (
      gen_random_uuid(),
      ${name},
      ${district},
      'Tamil Nadu',
      ST_SetSRID(ST_GeomFromGeoJSON(${geoJson}), 4326),
      ${surge_multiplier},
      true,
      NOW()
    )
    RETURNING id, name, district, surge_multiplier
  `;
  return result[0];
}

async function updateSurge(zoneId, surge_multiplier) {
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new NotFoundError('Zone not found');

  return prisma.zone.update({
    where: { id: zoneId },
    data: { surge_multiplier },
  });
}

module.exports = { listZones, createZone, updateSurge };
