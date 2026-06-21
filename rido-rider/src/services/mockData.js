const delay = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_USER = {
  id: 'user-001',
  name: 'Priya',
  phone: '9876543210',
  gender: 'FEMALE',
  profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120&h=120',
  wallet_balance: 240,
  rating: 4.9,
};

const MOCK_DRIVER = {
  id: 'driver-001',
  name: 'Murugan',
  phone: '9123456789',
  rating: 4.8,
  total_trips: 1240,
  profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120',
  vehicle: {
    make: 'Maruti',
    model: 'Alto',
    color: 'White',
    registration_number: 'TN59 AB 1234',
    type: 'MINI_CAR',
  },
};

const MOCK_RIDE = {
  id: 'ride-001',
  status: 'DRIVER_ASSIGNED',
  mode: 'SHARED',
  is_womens_ride: true,
  pickup_address: 'Anna Nagar, Madurai',
  drop_address: 'Bypass Road, Madurai',
  pickup_lat: 9.9252,
  pickup_lng: 78.1198,
  drop_lat: 9.9412,
  drop_lng: 78.1456,
  fare_estimate: 72,
  fare_final: null,
  otp: '4821',
  payment_method: 'UPI',
  vehicle_type: 'MINI_CAR',
  driver: MOCK_DRIVER,
  distance_km: 8.2,
  duration_min: 24,
  pool: {
    id: 'pool-001',
    passenger_count: 2,
    co_riders: [{ first_name: 'Kavitha' }],
    savings: 85,
    solo_fare: 145,
    shared_fare: 60,
  },
};

const MOCK_PLACES = [
  { id: 'p1', name: 'Meenakshi Temple', address: 'Madurai Main, Tamil Nadu', lat: 9.9195, lng: 78.1193 },
  { id: 'p2', name: 'Mattuthavani Bus Stand', address: 'Mattuthavani, Madurai', lat: 9.9442, lng: 78.1221 },
  { id: 'p3', name: 'Apollo Hospital', address: 'KK Nagar, Madurai', lat: 9.9102, lng: 78.1312 },
  { id: 'p4', name: 'Bypass Road Junction', address: 'NH-44, Madurai', lat: 9.9412, lng: 78.1456 },
];

const MOCK_RIDE_HISTORY = [
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
];

const MOCK_WALLET_TXNS = [
  { id: 'txn-1', type: 'CREDIT', description: 'Added money', amount: 500, created_at: new Date().toISOString() },
  { id: 'txn-2', type: 'DEBIT', description: 'Ride payment', amount: -72, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'txn-3', type: 'CREDIT', description: 'Refund', amount: 50, created_at: new Date(Date.now() - 86400000).toISOString() },
];

export async function mockRequest(method, url, data) {
  await delay();

  if (url.includes('/auth/send-otp')) {
    return { data: { success: true, message: 'OTP sent' } };
  }

  if (url.includes('/auth/verify-otp')) {
    const isNew = data?.phone === '9000000000';
    return {
      data: {
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          is_new_user: isNew,
          user: isNew ? { ...MOCK_USER, name: null, id: 'user-new' } : MOCK_USER,
        },
      },
    };
  }

  if (url.includes('/auth/refresh')) {
    return { data: { data: { access_token: 'mock-access-token-refreshed', refresh_token: 'mock-refresh-token' } } };
  }

  if (url.includes('/users/me') && method === 'GET') {
    return { data: { data: MOCK_USER } };
  }

  if (url.includes('/users/me') && method === 'PATCH') {
    return { data: { data: { ...MOCK_USER, ...data } } };
  }

  if (url.includes('/users/me/rides')) {
    return { data: { data: MOCK_RIDE_HISTORY, next_cursor: null } };
  }

  if (url.includes('/users/me/wallet')) {
    return { data: { data: { balance: 240, transactions: MOCK_WALLET_TXNS } } };
  }

  if (url.includes('/emergency-contacts')) {
    if (method === 'GET') {
      return { data: { data: [{ id: 'ec-1', name: 'Amma', phone: '9876500000', relationship: 'Mother' }] } };
    }
    return { data: { data: { id: 'ec-new', ...data } } };
  }

  if (url.includes('/fare/estimate')) {
    const surge = 1.2;
    const distance = 8.2;
    const base = 30 + distance * 12;
    return {
      data: {
        data: {
          solo_fare: Math.round(base * surge),
          shared_fare_min: Math.round((base * surge) / 2.2),
          shared_fare_max: Math.round((base * surge) / 1.8),
          surge_multiplier: surge,
          distance_km: distance,
          duration_min: 28,
          eta_min: 3,
        },
      },
    };
  }

  if (url.includes('/rides') && method === 'POST') {
    return {
      data: {
        data: {
          ...MOCK_RIDE,
          id: `ride-${Date.now()}`,
          status: data?.mode === 'SHARED' ? 'POOL_MATCHING' : 'SEARCHING',
          mode: data?.mode || 'SOLO',
          is_womens_ride: data?.is_womens_ride || false,
          payment_method: data?.payment_method || 'UPI',
          vehicle_type: data?.vehicle_type || 'MINI_CAR',
        },
      },
    };
  }

  if (url.match(/\/rides\/[^/]+$/) && method === 'GET') {
    return { data: { data: MOCK_RIDE } };
  }

  if (url.includes('/cancel')) {
    return { data: { data: { ...MOCK_RIDE, status: 'CANCELLED' } } };
  }

  if (url.includes('/driver-location')) {
    return {
      data: {
        data: { lat: 9.928, lng: 78.122, heading: 45, eta_min: 4 },
      },
    };
  }

  if (url.includes('/pools/status')) {
    return {
      data: {
        data: {
          status: 'MATCHED',
          pool: MOCK_RIDE.pool,
          closes_in_sec: 272,
        },
      },
    };
  }

  if (url.includes('/payments/initiate')) {
    return { data: { data: { order_id: 'order_mock_123', amount: data?.amount || 100 } } };
  }

  if (url.includes('/payments/verify')) {
    return { data: { data: { success: true } } };
  }

  if (url.includes('places') || url.includes('autocomplete')) {
    const q = (data?.query || '').toLowerCase();
    const results = MOCK_PLACES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    );
    return { data: { data: results.length ? results : MOCK_PLACES } };
  }

  return { data: { data: null } };
}

export function searchPlaces(query) {
  const q = query.toLowerCase();
  return MOCK_PLACES.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
  );
}

export { MOCK_USER, MOCK_DRIVER, MOCK_RIDE, MOCK_PLACES, MOCK_RIDE_HISTORY };
