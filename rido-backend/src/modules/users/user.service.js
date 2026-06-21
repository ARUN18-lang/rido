const prisma = require('../../utils/prisma');
const { NotFoundError } = require('../../utils/errors');
const config = require('../../config');

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      gender: true,
      role: true,
      profile_photo_url: true,
      preferred_language: true,
      wallet_balance: true,
      is_phone_verified: true,
      created_at: true,
    },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

async function updateMe(userId, data) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      gender: true,
      role: true,
      profile_photo_url: true,
      preferred_language: true,
    },
  });
}

async function updateProfilePhoto(userId, fileUrl) {
  return prisma.user.update({
    where: { id: userId },
    data: { profile_photo_url: fileUrl },
    select: { profile_photo_url: true },
  });
}

async function getRideHistory(userId, { cursor, limit }) {
  const where = { rider_id: userId };
  if (cursor) {
    const [createdAt, id] = cursor.split('|');
    where.OR = [
      { created_at: { lt: new Date(createdAt) } },
      { created_at: new Date(createdAt), id: { lt: id } },
    ];
  }

  const rides = await prisma.ride.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      status: true,
      mode: true,
      type: true,
      pickup_address: true,
      drop_address: true,
      estimated_fare: true,
      final_fare: true,
      distance_km: true,
      created_at: true,
      completed_at: true,
    },
  });

  const hasMore = rides.length > limit;
  const items = hasMore ? rides.slice(0, limit) : rides;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? `${last.created_at.toISOString()}|${last.id}` : null;

  const total = await prisma.ride.count({ where: { rider_id: userId } });

  return { items, meta: { next_cursor: nextCursor, has_more: hasMore, total } };
}

async function getWallet(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wallet_balance: true },
  });
  return { balance: user?.wallet_balance ?? 0 };
}

async function addEmergencyContact(userId, data) {
  if (data.is_primary) {
    await prisma.emergencyContact.updateMany({
      where: { user_id: userId },
      data: { is_primary: false },
    });
  }
  return prisma.emergencyContact.create({
    data: { user_id: userId, ...data },
  });
}

async function getEmergencyContacts(userId) {
  return prisma.emergencyContact.findMany({
    where: { user_id: userId },
    orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
  });
}

async function deleteEmergencyContact(userId, contactId) {
  const contact = await prisma.emergencyContact.findFirst({
    where: { id: contactId, user_id: userId },
  });
  if (!contact) throw new NotFoundError('Emergency contact not found');
  await prisma.emergencyContact.delete({ where: { id: contactId } });
  return { deleted: true };
}

module.exports = {
  getMe,
  updateMe,
  updateProfilePhoto,
  getRideHistory,
  getWallet,
  addEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
};
