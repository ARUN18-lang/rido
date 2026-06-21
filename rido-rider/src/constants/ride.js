export const RIDE_STATUS = {
  SEARCHING: 'SEARCHING',
  POOL_MATCHING: 'POOL_MATCHING',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

export const ACTIVE_RIDE_STATUSES = [
  RIDE_STATUS.SEARCHING,
  RIDE_STATUS.POOL_MATCHING,
  RIDE_STATUS.DRIVER_ASSIGNED,
  RIDE_STATUS.DRIVER_ARRIVED,
  RIDE_STATUS.IN_PROGRESS,
];

export const RIDE_MODE = {
  SOLO: 'SOLO',
  SHARED: 'SHARED',
};

export const VEHICLE_TYPES = [
  { id: 'AUTO', name: 'Auto', icon: '🛺', capacity: 3, baseFare: 30 },
  { id: 'MINI_CAR', name: 'Mini', icon: '🚗', capacity: 3, baseFare: 40 },
  { id: 'SEDAN', name: 'Sedan', icon: '🚙', capacity: 4, baseFare: 50 },
  { id: 'SUV', name: 'SUV', icon: '🚘', capacity: 6, baseFare: 70 },
];

export const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI', icon: '📱', description: 'Pay via any UPI app' },
  { id: 'CASH', label: 'Cash', icon: '💵', description: 'Pay driver directly' },
  { id: 'WALLET', label: 'Wallet', icon: '👛', description: 'Rido Wallet' },
];

export const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
};
