export const DRIVER_STATUS = {
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  ON_RIDE: 'ON_RIDE',
};

export const KYC_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const DRIVER_RIDE_STATE = {
  HEADING_TO_PICKUP: 'HEADING_TO_PICKUP',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  RIDE_IN_PROGRESS: 'RIDE_IN_PROGRESS',
  RIDE_ENDING: 'RIDE_ENDING',
};

export const DOCUMENT_TYPES = [
  { id: 'AADHAAR_FRONT', label: 'Aadhaar Front', description: 'Clear photo of front side' },
  { id: 'AADHAAR_BACK', label: 'Aadhaar Back', description: 'Clear photo of back side' },
  { id: 'DRIVING_LICENSE', label: 'Driving License', description: 'Valid driving license' },
  { id: 'VEHICLE_RC', label: 'Vehicle RC', description: 'Registration certificate' },
  { id: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance', description: 'Valid insurance document' },
];

export const VEHICLE_TYPES = [
  { id: 'AUTO', name: 'Auto', capacity: 3 },
  { id: 'MINI_CAR', name: 'Mini Car', capacity: 3 },
  { id: 'SEDAN', name: 'Sedan', capacity: 4 },
  { id: 'SUV', name: 'SUV', capacity: 6 },
];

export const RIDE_MODE = {
  SOLO: 'SOLO',
  SHARED: 'SHARED',
};
