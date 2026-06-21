const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

const MOCK_DRIVER = {
  id: 'driver-001',
  name: 'Murugan',
  profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
  kyc_status: 'APPROVED',
  status: 'OFFLINE',
  is_womens_ride_eligible: true,
  rating: 4.8,
  total_trips: 1240,
  commission_rate: 0.1,
};

const MOCK_INCOMING_RIDE = {
  id: 'ride-incoming-001',
  mode: 'SHARED',
  is_womens_ride: false,
  fare: 148,
  pickup_address: 'Anna Nagar, Madurai',
  drop_address: 'Bypass Road, Madurai',
  pickup_lat: 9.9252,
  pickup_lng: 78.1198,
  drop_lat: 9.9412,
  drop_lng: 78.1456,
  pickup_distance_km: 1.2,
  total_distance_km: 8.4,
  duration_min: 28,
  passenger_count: 2,
  waypoints: [
    { order: 1, name: 'Priya', address: 'Anna Nagar, Madurai', distance_km: 1.2 },
    { order: 2, name: 'Kavitha', address: 'KK Nagar, Madurai', distance_km: 2.1 },
  ],
  rider: {
    name: 'Priya',
    rating: 4.9,
    profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120&h=120'
  },
  payment_method: 'CASH',
};

const MOCK_EARNINGS = {
  today: { earnings: 340, trips: 4 },
  week: [
    { day: 'Mon', earnings: 420 },
    { day: 'Tue', earnings: 380 },
    { day: 'Wed', earnings: 510 },
    { day: 'Thu', earnings: 340 },
    { day: 'Fri', earnings: 290 },
    { day: 'Sat', earnings: 620 },
    { day: 'Sun', earnings: 180 },
  ],
  trips: [
    { id: 't1', time: '9:41 AM', route: 'Anna Nagar → Bypass Rd', earnings: 133, mode: 'SOLO' },
    { id: 't2', time: '11:20 AM', route: 'KK Nagar → Temple', earnings: 145, mode: 'SHARED' },
  ],
};

export async function mockRequest(method, url, data) {
  await delay();

  if (url.includes('/auth/send-otp')) return { data: { success: true } };
  if (url.includes('/auth/verify-otp')) {
    const isNew = data?.phone === '9000000000';
    return {
      data: {
        data: {
          access_token: 'mock-driver-token',
          refresh_token: 'mock-refresh',
          is_new_user: isNew,
          user: {
            id: 'u1',
            phone: data?.phone,
            name: isNew ? null : 'Murugan',
            profile_photo_url: isNew ? null : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120'
          },
          driver: isNew ? { kyc_status: 'PENDING' } : MOCK_DRIVER,
        },
      },
    };
  }
  if (url.includes('/drivers/me/status')) {
    return { data: { data: { status: data?.status || 'ONLINE' } } };
  }
  if (url.includes('/drivers/me') && method === 'GET') {
    return { data: { data: MOCK_DRIVER } };
  }
  if (url.includes('/drivers/register')) {
    return { data: { data: { ...MOCK_DRIVER, kyc_status: 'PENDING' } } };
  }
  if (url.includes('/drivers/documents')) {
    return { data: { data: { url: 'https://mock-s3/doc.jpg', type: data?.type } } };
  }
  if (url.includes('/drivers/me/earnings')) {
    return { data: { data: MOCK_EARNINGS } };
  }
  if (url.includes('/drivers/me/rides')) {
    return { data: { data: [
      {
        id: 'hist-1',
        created_at: new Date().toISOString(),
        pickup_address: 'Anna Nagar, Madurai',
        drop_address: 'Mattuthavani Bus Stand',
        mode: 'SHARED',
        is_womens_ride: false,
        fare: 72,
        saved: 76,
        status: 'COMPLETED',
      },
      {
        id: 'hist-2',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        pickup_address: 'KK Nagar, Madurai',
        drop_address: 'Meenakshi Temple',
        mode: 'SOLO',
        is_womens_ride: true,
        fare: 148,
        saved: 0,
        status: 'COMPLETED',
      },
    ] } };
  }
  if (url.includes('/users/me/wallet')) {
    return { data: { data: { balance: 320, transactions: [
      { id: 'txn-1', type: 'CREDIT', description: 'Added money', amount: 500, created_at: new Date().toISOString() },
      { id: 'txn-2', type: 'DEBIT', description: 'Payout to bank', amount: -200, created_at: new Date(Date.now() - 3600000).toISOString() },
    ] } } };
  }
  if (url.includes('/payments/initiate')) {
    return { data: { success: true } };
  }
  if (url.includes('/emergency-contacts')) {
    if (method === 'GET') {
      return { data: { data: [{ id: 'ec-1', name: 'Amma', phone: '9876500000', relationship: 'Mother' }] } };
    }
    return { data: { data: { id: 'ec-new', ...data } } };
  }
  if (url.includes('/cash-confirm')) {
    return { data: { data: { success: true } } };
  }
  if (url.includes('/vehicles')) {
    return { data: { data: { id: 'v1', ...data } } };
  }
  return { data: { data: null } };
}

export function getMockIncomingRide() {
  return { ...MOCK_INCOMING_RIDE, id: `ride-${Date.now()}` };
}

export { MOCK_DRIVER, MOCK_INCOMING_RIDE, MOCK_EARNINGS };
