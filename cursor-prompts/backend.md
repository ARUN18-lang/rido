You are a senior backend engineer. Build a production-ready, monolithic Node.js backend for "Rapido" — a ride-sharing platform launching in Tamil Nadu, India. Follow every instruction exactly. Do not skip any section.

---

## TECH STACK

- Runtime: Node.js (v20+)
- Framework: Express.js
- Database: PostgreSQL 15 with PostGIS extension
- ORM: Prisma (with raw SQL via $queryRaw for PostGIS queries)
- Cache: Redis (ioredis)
- Queue: BullMQ (Redis-backed)
- Real-time: Socket.io
- Auth: JWT (access + refresh tokens) + OTP via MSG91
- Payments: Razorpay
- Maps: Google Maps Platform (Directions API, Distance Matrix, Places)
- Push: Firebase Admin SDK (FCM)
- File Upload: AWS S3 (multer-s3)
- Validation: Zod
- Logging: Winston + Morgan
- Error Tracking: Sentry
- Testing: Jest + Supertest
- Language: JavaScript (CommonJS)

---

## PROJECT STRUCTURE

Create this exact folder structure:

rapido-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.js                  # Express app setup
│   ├── server.js               # HTTP + Socket.io server bootstrap
│   ├── config/
│   │   ├── index.js            # All env vars exported from one place
│   │   ├── redis.js            # ioredis client singleton
│   │   ├── firebase.js         # Firebase Admin SDK init
│   │   ├── s3.js               # AWS S3 client
│   │   ├── razorpay.js         # Razorpay instance
│   │   └── maps.js             # Google Maps client
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js
│   │   ├── users/
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   └── user.schema.js
│   │   ├── drivers/
│   │   │   ├── driver.routes.js
│   │   │   ├── driver.controller.js
│   │   │   ├── driver.service.js
│   │   │   └── driver.schema.js
│   │   ├── vehicles/
│   │   │   ├── vehicle.routes.js
│   │   │   ├── vehicle.controller.js
│   │   │   ├── vehicle.service.js
│   │   │   └── vehicle.schema.js
│   │   ├── rides/
│   │   │   ├── ride.routes.js
│   │   │   ├── ride.controller.js
│   │   │   ├── ride.service.js
│   │   │   └── ride.schema.js
│   │   ├── pooling/
│   │   │   ├── pool.routes.js
│   │   │   ├── pool.controller.js
│   │   │   ├── pool.service.js
│   │   │   └── pool.schema.js
│   │   ├── fare/
│   │   │   ├── fare.routes.js
│   │   │   ├── fare.controller.js
│   │   │   ├── fare.service.js
│   │   │   └── fare.schema.js
│   │   ├── payments/
│   │   │   ├── payment.routes.js
│   │   │   ├── payment.controller.js
│   │   │   ├── payment.service.js
│   │   │   └── payment.schema.js
│   │   ├── tracking/
│   │   │   ├── tracking.socket.js  # All socket event handlers
│   │   │   └── tracking.service.js
│   │   ├── notifications/
│   │   │   ├── notification.service.js
│   │   │   └── notification.templates.js
│   │   ├── admin/
│   │   │   ├── admin.routes.js
│   │   │   ├── admin.controller.js
│   │   │   └── admin.service.js
│   │   └── zones/
│   │       ├── zone.routes.js
│   │       ├── zone.controller.js
│   │       └── zone.service.js
│   ├── workers/
│   │   ├── index.js            # Register all workers
│   │   ├── pool.worker.js      # Pool matching job processor
│   │   ├── notification.worker.js
│   │   ├── ride.worker.js      # Timeout, auto-cancel jobs
│   │   └── payment.worker.js   # Retry failed payments
│   ├── queues/
│   │   └── index.js            # All BullMQ queue definitions
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   ├── validate.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   ├── upload.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── response.js         # Standard API response helpers
│   │   ├── geo.js              # Haversine, bearing, polyline helpers
│   │   ├── otp.js              # OTP generate, send, verify via MSG91
│   │   ├── jwt.js              # Sign, verify access + refresh tokens
│   │   ├── fare.calculator.js  # Core fare and split computation
│   │   └── errors.js           # Custom error classes
│   └── constants/
│       ├── ride.constants.js
│       ├── fare.constants.js
│       └── roles.constants.js
├── tests/
│   ├── unit/
│   │   ├── fare.calculator.test.js
│   │   └── geo.test.js
│   └── integration/
│       ├── auth.test.js
│       ├── rides.test.js
│       └── pooling.test.js
├── .env.example
├── .gitignore
├── package.json
└── README.md

---

## DATABASE SCHEMA (Prisma)

Build the complete prisma/schema.prisma with these models. Use PostgreSQL. Enable PostGIS via unsupported types where needed.

### Enums
- Gender: MALE, FEMALE, OTHER
- UserRole: RIDER, DRIVER, ADMIN
- RideMode: SOLO, SHARED
- RideType: STANDARD, WOMEN_ONLY
- RideStatus: SEARCHING, POOL_MATCHING, DRIVER_ASSIGNED, DRIVER_ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED, FAILED
- PoolStatus: WAITING, MATCHED, CONFIRMED, ACTIVE, COMPLETED, CANCELLED
- DriverStatus: OFFLINE, ONLINE, ON_RIDE
- VehicleType: AUTO, MINI_CAR, SEDAN, SUV, TEMPO (each has different max_passenger_capacity)
- PaymentMethod: UPI, CASH, WALLET, CARD
- PaymentStatus: PENDING, SUCCESS, FAILED, REFUNDED
- KycStatus: PENDING, APPROVED, REJECTED
- DocumentType: AADHAAR, DRIVING_LICENSE, VEHICLE_RC, VEHICLE_INSURANCE, PROFILE_PHOTO

### Models

**User**: id (uuid), phone (unique), name, email (nullable), gender, role (default RIDER), is_active, is_phone_verified, profile_photo_url, fcm_token, preferred_language (default 'ta'), wallet_balance (Decimal, default 0), created_at, updated_at
  - Relations: rides, driver_profile, payments, emergency_contacts, ratings_given

**EmergencyContact**: id, user_id, name, phone, is_primary, created_at

**Driver**: id, user_id (unique FK), kyc_status, is_female_verified (for women rides), current_lat, current_lng, current_heading, last_location_updated_at, status (DriverStatus), rating (Decimal default 5.0), total_trips, total_earnings, is_women_ride_enabled, created_at, updated_at
  - Relations: user, vehicles, rides, driver_documents

**DriverDocument**: id, driver_id, document_type, file_url, verified, rejected_reason, uploaded_at

**Vehicle**: id, driver_id, type (VehicleType), make, model, year, color, registration_number (unique), max_passengers, is_active, is_ac, created_at

**VehicleFareConfig**: id, vehicle_type (unique), base_fare, per_km_rate, per_minute_rate, min_fare, cancellation_fee, shared_discount_percent (how much each rider saves in shared), driver_shared_bonus_percent (extra % driver earns for pooled), updated_at

**Zone**: id, name, district, state (default 'Tamil Nadu'), polygon (Unsupported("geometry(Polygon,4326)")), surge_multiplier (Decimal default 1.0), is_active, created_at

**Ride**: id (uuid), rider_id, driver_id (nullable), vehicle_id (nullable), pool_id (nullable FK to RidePool), mode (RideMode), type (RideType), status (RideStatus), pickup_address, pickup_lat, pickup_lng, pickup_geom (Unsupported("geometry(Point,4326)")), drop_address, drop_lat, drop_lng, drop_geom (Unsupported("geometry(Point,4326)")), route_polyline (Text, encoded polyline from Google), distance_km (Decimal), duration_minutes (Int), estimated_fare (Decimal), final_fare (Decimal nullable), surge_multiplier (Decimal default 1.0), rider_otp (4-digit, for driver to confirm pickup), cancellation_reason (nullable), cancelled_by (nullable), started_at, completed_at, created_at, updated_at
  - Relations: rider (User), driver, vehicle, pool, payment, ratings, ride_waypoints

**RideWaypoint**: id, ride_id, sequence (Int), lat, lng, geom (Unsupported("geometry(Point,4326)")), recorded_at — stores actual path driven

**RidePool**: id (uuid), vehicle_type, max_passengers (from vehicle), current_passenger_count (default 0), status (PoolStatus), driver_id (nullable), vehicle_id (nullable), combined_route_polyline, total_distance_km, total_fare (combined), zone_id (nullable), pool_window_start, pool_window_end (5 min window), matched_at, started_at, completed_at, created_at
  - Relations: rides (list of Ride), driver, vehicle

**PoolFareAllocation**: id, pool_id, ride_id (unique), rider_id, allocated_fare (Decimal), distance_share_percent (Decimal), is_paid, created_at

**Payment**: id (uuid), ride_id (unique), user_id, amount (Decimal), method (PaymentMethod), status (PaymentStatus), razorpay_order_id (nullable), razorpay_payment_id (nullable), razorpay_signature (nullable), cash_collected_by_driver (Boolean default false), refund_id (nullable), refund_amount (Decimal nullable), created_at, updated_at

**Rating**: id, ride_id, rater_id, ratee_id, score (Int 1-5), comment (nullable), created_at
  - Unique constraint on [ride_id, rater_id]

**OtpLog**: id, phone, otp_hash (store hash not plain text), purpose (LOGIN, RIDE_START, etc.), expires_at, used_at (nullable), attempts (default 0), created_at

**RefreshToken**: id, user_id, token_hash, expires_at, revoked_at (nullable), device_id, created_at

**AuditLog**: id, actor_id, action, entity_type, entity_id, metadata (Json), ip_address, created_at

---

## MODULE IMPLEMENTATIONS

### 1. AUTH MODULE

**Endpoints:**
- POST /api/v1/auth/send-otp — body: { phone, purpose: 'LOGIN' | 'REGISTER' }
- POST /api/v1/auth/verify-otp — body: { phone, otp, device_id }
- POST /api/v1/auth/refresh — body: { refresh_token }
- POST /api/v1/auth/logout — body: { refresh_token }

**Logic:**
- OTP is 6-digit, expires in 10 minutes
- Hash OTP with bcrypt before storing in OtpLog
- Max 5 OTP attempts before lockout (store lockout in Redis with TTL)
- Rate limit: max 3 OTP sends per phone per hour (Redis counter with TTL)
- On verify: if user doesn't exist, create with role RIDER; return { is_new_user: true }
- Issue access token (15min TTL) and refresh token (30 days TTL)
- Store refresh token hash in DB; allow multiple devices
- On logout: revoke refresh token (set revoked_at)
- On refresh: validate token, check not revoked, issue new access token

### 2. USERS MODULE

**Endpoints (all require auth):**
- GET /api/v1/users/me
- PATCH /api/v1/users/me — update name, email, gender, preferred_language, fcm_token
- POST /api/v1/users/me/photo — upload profile photo to S3
- GET /api/v1/users/me/rides — paginated ride history
- GET /api/v1/users/me/wallet — wallet balance
- POST /api/v1/users/emergency-contacts — add contact
- GET /api/v1/users/emergency-contacts
- DELETE /api/v1/users/emergency-contacts/:id

### 3. DRIVERS MODULE

**Endpoints:**
- POST /api/v1/drivers/register — create driver profile (requires RIDER role; upgrades to DRIVER)
- POST /api/v1/drivers/documents — upload KYC documents (S3)
- GET /api/v1/drivers/me — driver profile + vehicle
- PATCH /api/v1/drivers/me — update profile
- POST /api/v1/drivers/me/status — body: { status: 'ONLINE' | 'OFFLINE' } + { lat, lng }
- GET /api/v1/drivers/me/earnings — daily/weekly/monthly breakdown
- GET /api/v1/drivers/me/rides — paginated

**Logic:**
- Driver can only go ONLINE if: KYC is APPROVED, has at least one active vehicle, has uploaded all required documents
- When driver goes ONLINE: store location in Redis as geospatial set (GEOADD rapido:drivers:online driver_id lng lat)
- When OFFLINE: ZREM from Redis set; update DB status
- Validate: Women's Ride can only be enabled if is_female_verified = true (admin sets this after document check)

### 4. VEHICLES MODULE

**Endpoints (driver only):**
- POST /api/v1/vehicles — register vehicle
- GET /api/v1/vehicles — list driver's vehicles
- PATCH /api/v1/vehicles/:id — update
- DELETE /api/v1/vehicles/:id — deactivate
- PATCH /api/v1/vehicles/:id/activate — set as active

**Logic:**
- max_passengers is set by VehicleType (AUTO=3, MINI_CAR=4, SEDAN=4, SUV=6, TEMPO=8)
- Only one vehicle can be active per driver at a time
- Cannot delete a vehicle if it has active rides

### 5. FARE MODULE

**Endpoints (public):**
- POST /api/v1/fare/estimate — body: { pickup_lat, pickup_lng, drop_lat, drop_lng, vehicle_type, mode: 'SOLO'|'SHARED', ride_type: 'STANDARD'|'WOMEN_ONLY' }

**Response must include:**
- solo_fare: { base, per_km, per_minute, surge, total }
- shared_fare_estimate: { per_passenger_estimate, max_passengers, potential_savings }
- distance_km, duration_minutes
- surge_multiplier, zone_name

**fare.calculator.js — implement these functions:**
computeSoloFare({ distanceKm, durationMinutes, vehicleType, surgeMultiplier })

→ { baseFare, distanceCharge, timeCharge, surgeFee, total, breakdown }
computeSharedFareSplit({ rides, combinedDistanceKm, combinedDurationMinutes, vehicleType, surgeMultiplier })

→ rides.map(ride => ({ rideId, allocatedFare, distanceSharePercent, savings }))
Algorithm:

Each rider's share = (their_route_km / sum_of_all_riders_route_km) * combinedFare
combinedFare = computeSoloFare for the combined optimized route
Driver earns: combinedFare * (1 - commission) + shared_bonus_percent
Cap: no rider pays MORE in shared than they would in solo
If sharing causes any rider's fare to exceed solo fare: do not pool them

getSurgeMultiplier({ lat, lng })

→ queries Zone table using PostGIS ST_Contains(zone.polygon, ST_Point(lng, lat))

→ returns zone's surge_multiplier (default 1.0 if no zone found)

### 6. RIDES MODULE

**Endpoints (rider auth):**
- POST /api/v1/rides — create ride request
- GET /api/v1/rides/:id — get ride details
- POST /api/v1/rides/:id/cancel — cancel ride
- GET /api/v1/rides/:id/driver-location — current driver lat/lng from Redis

**POST /api/v1/rides body:**
```json
{
  "pickup_lat": 9.9252,
  "pickup_lng": 78.1198,
  "pickup_address": "Anna Nagar, Madurai",
  "drop_lat": 9.9312,
  "drop_lng": 78.1560,
  "drop_address": "Bypass Road, Madurai",
  "vehicle_type": "AUTO",
  "mode": "SHARED",
  "ride_type": "STANDARD"
}
```

**Ride creation flow:**
1. Validate: if ride_type = WOMEN_ONLY, check rider.gender = FEMALE
2. Call Google Directions API to get route polyline, distance_km, duration_minutes
3. Get surge multiplier for pickup location
4. Compute estimated_fare using fare.calculator
5. Create Ride record with status = SEARCHING
6. If mode = SOLO: dispatch findDriverJob to queue
7. If mode = SHARED: dispatch poolMatchJob to queue (5-minute window)
8. Return ride immediately (polling or socket for updates)

**Cancellation rules:**
- RIDER can cancel before driver is assigned: no charge
- RIDER cancels after driver assigned and within 2 min: no charge
- RIDER cancels after 2 min of assignment: cancellation_fee applies
- DRIVER cancels: no charge to rider; driver gets a strike
- Admin can cancel any ride with reason

### 7. POOLING MODULE — CORE LOGIC

This is the most critical module. Implement completely.

**pool.service.js — findPoolMatch(rideId):**

Load the ride from DB (with pickup/drop coords and route_polyline)
Query Redis for open pool requests:

Key pattern: rapido:pool:waiting:{vehicle_type}:{ride_type}
Each entry: { rideId, pickup_lat, pickup_lng, drop_lat, drop_lng, route_polyline, max_passengers, created_at, rider_gender }


Filter candidates:

a. pickup_radius: candidate pickup must be within 3 KM of current ride pickup (Haversine)

b. time_window: candidate created_at within last 5 minutes

c. gender_filter: if ride_type = WOMEN_ONLY, candidate rider must be FEMALE

d. capacity: pool must not exceed vehicle max_passengers
For each candidate, compute route overlap:

a. Decode both polylines to lat/lng arrays

b. Check if drop points are in the same direction (bearing check, max 45° deviation)

c. Compute overlapping segment length using point-to-segment distance matching

d. overlap_percent = overlapping_length / min(ride1_length, ride2_length) * 100

e. Threshold: overlap_percent >= 65%
For multi-passenger pools (>2 riders):

a. Re-run overlap check for the new combined route vs the candidate

b. Combined route = Google Directions API with all stops as waypoints

c. Ensure adding this rider doesn't increase any existing rider's fare above their solo fare
Score candidates: sort by (overlap_percent DESC, distance_to_pickup ASC)
Select best match
If match found:

a. Create or update RidePool record

b. Link ride to pool

c. Compute fare split via fare.calculator.computeSharedFareSplit

d. Create PoolFareAllocation records for each rider

e. If pool has reached max_passengers OR no more candidates: proceed to driver assignment

f. Emit 'pool:matched' socket event to all matched riders with co-rider count (NOT personal details)
If no match found after 5 minutes:

a. Convert ride to SOLO mode

b. Dispatch findDriverJob

c. Notify rider of conversion

**pool.worker.js — processes poolMatchJob:**
- Run findPoolMatch every 30 seconds for waiting rides
- After 5 minutes: trigger conversion to solo
- Handle race conditions with Redis distributed lock (ioredis + Redlock) — two pool matches cannot run simultaneously for the same ride

**findDriver flow (ride.worker.js):**

Get all ONLINE drivers from Redis GEORADIUS rapido:drivers:online lng lat 5 km ASC COUNT 10
Filter by:

a. vehicle_type matches

b. if ride_type = WOMEN_ONLY: driver.is_women_ride_enabled = true

c. driver not already on a ride (status != ON_RIDE)

d. driver rating >= 3.5
For each candidate driver (up to 10), in order:

a. Send FCM push notification: "New ride request"

b. Emit socket event ride:driver_request to driver's socket room

c. Store pending offer in Redis with 20s TTL: rapido:offer:{rideId}:{driverId}

d. Wait for driver response via socket event driver:accept or driver:decline

e. If accepted within 20s: assign driver, break loop

f. If declined or timeout: try next driver
If no driver found after all 10:

a. Expand radius to 10 KM, retry once

b. If still none: status = FAILED, notify rider
On driver assigned:

a. Update Ride: status = DRIVER_ASSIGNED, driver_id, vehicle_id

b. Generate 4-digit rider_otp (driver must confirm at pickup)

c. Update driver status = ON_RIDE in Redis and DB

d. Emit ride:driver_assigned to rider socket with driver info, ETA

e. Send SMS to rider with driver name, vehicle number, OTP

### 8. TRACKING MODULE (Socket.io)

**Socket authentication:**
- Client must send auth: { token } in socket handshake
- Middleware validates JWT, attaches user to socket

**Socket rooms:**
- ride:{rideId} — all parties of a ride join this room
- driver:{driverId} — driver's personal room for offer notifications

**Events server → client:**
- ride:status_update — { rideId, status, timestamp }
- ride:driver_assigned — { driver: { name, phone_masked, vehicle_number, vehicle_color, rating }, eta_minutes }
- ride:driver_location — { lat, lng, heading, timestamp }
- ride:pool_matched — { pool_size, co_riders_count, new_fare, savings }
- ride:driver_arrived — { timestamp }
- ride:started — { otp_verified: true, started_at }
- ride:completed — { fare, distance_km, duration_minutes }
- ride:cancelled — { reason, refund_amount }
- ride:driver_request — { ride_id, pickup_address, drop_address, fare_estimate, distance_km } (to driver)
- pool:new_candidate — notify driver of additional passenger added to pool

**Events client → server:**
- driver:location_update — { lat, lng, heading } (driver sends every 4 seconds while ON_RIDE)
  → Store in Redis: SET rapido:location:{driverId} JSON(lat,lng,heading,ts) EX 30
  → If ride active: broadcast to ride:{rideId} room as ride:driver_location
  → Also update driver_locations table every 30s (not every update, to reduce DB writes)
- driver:accept — { ride_id }
- driver:decline — { ride_id }
- driver:arrived — { ride_id } → status = DRIVER_ARRIVED
- driver:start_ride — { ride_id, otp } → validate OTP, status = IN_PROGRESS
- driver:end_ride — { ride_id, final_lat, final_lng }
- rider:sos — { ride_id, lat, lng } → trigger SOS flow

**Route deviation detection:**
- On each driver:location_update during IN_PROGRESS: decode ride.route_polyline
- Check if driver's current position is >500m from nearest point on route
- If deviated: emit ride:route_deviation to rider's socket + send push notification

### 9. PAYMENTS MODULE

**Endpoints:**
- POST /api/v1/payments/initiate — create Razorpay order for non-cash rides
- POST /api/v1/payments/verify — verify Razorpay signature after payment
- POST /api/v1/payments/webhook — Razorpay webhook (verify signature, idempotent processing)
- POST /api/v1/payments/:rideId/cash-confirm — driver confirms cash received
- GET /api/v1/payments/:rideId — get payment details
- POST /api/v1/payments/:rideId/refund — admin only

**Pooled ride payments:**
- Each rider in a pool pays their PoolFareAllocation.allocated_fare
- Each rider has their own Payment record
- Driver's payout = sum of all PoolFareAllocations - platform commission
- Track separately in DriverEarnings table (add this model)

**Wallet:**
- User can add money to wallet via Razorpay
- On ride complete: deduct from wallet if method = WALLET
- Atomic deduction using Prisma transactions

### 10. ADMIN MODULE

**All routes require role = ADMIN**

**Endpoints:**
- GET /api/v1/admin/drivers — list with KYC status filter
- PATCH /api/v1/admin/drivers/:id/kyc — body: { status: 'APPROVED'|'REJECTED', reason? }
- PATCH /api/v1/admin/drivers/:id/women-verify — verify female driver
- GET /api/v1/admin/rides — list all rides with filters (status, date, district)
- POST /api/v1/admin/rides/:id/cancel — force cancel with reason
- GET /api/v1/admin/analytics — daily stats: rides, revenue, avg fare, pool match rate
- GET /api/v1/admin/zones — list zones
- POST /api/v1/admin/zones — create zone (accepts GeoJSON polygon)
- PATCH /api/v1/admin/zones/:id/surge — update surge multiplier
- GET /api/v1/admin/disputes — list flagged rides / complaints
- POST /api/v1/admin/drivers/:id/suspend — suspend driver account

### 11. NOTIFICATIONS MODULE

**notification.templates.js — implement these templates in both English and Tamil:**
- OTP message
- Ride confirmed (with OTP)
- Driver assigned (name, vehicle number)
- Driver arriving
- Ride started
- Ride completed (fare summary)
- Pool matched (you saved ₹X)
- Ride converted to solo (no pool found)
- SOS alert to emergency contacts

**notification.service.js:**
- sendPush(userId, { title, body, data }) — FCM via Firebase Admin
- sendSMS(phone, templateKey, params, language) — MSG91 with Tamil support
- sendToEmergencyContacts(userId, message) — SMS to all primary contacts

---

## MIDDLEWARE

### auth.middleware.js
- verifyAccessToken(req, res, next) — verify JWT, attach req.user
- optionalAuth — attach user if token present, don't fail if absent

### role.middleware.js
- requireRole(...roles) — check req.user.role is in allowed roles

### validate.middleware.js
- validate(schema) — Zod schema validation for body/params/query, returns 422 with field errors

### rateLimit.middleware.js
- Use express-rate-limit + rate-limit-redis
- Configs: apiLimiter (100/15min), authLimiter (10/15min), otpLimiter (3/hour per IP+phone)

### errorHandler.middleware.js
- Catch all errors, log with Winston, send to Sentry
- Custom error classes: AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError
- Never expose stack traces in production
- Standard error response: { success: false, error: { code, message, details? } }

### upload.middleware.js
- multer-s3 for direct S3 upload
- Allowed types: image/jpeg, image/png, application/pdf
- Max size: 5MB
- Generate unique S3 key with UUID

---

## RESPONSE FORMAT

All responses must follow:
```json
{
  "success": true,
  "data": {},
  "message": "optional",
  "meta": { "page": 1, "limit": 20, "total": 100 }  // for paginated responses
}
```

Implement sendSuccess(res, data, message, statusCode) and sendPaginated(res, data, meta) in utils/response.js

---

## EDGE CASES TO HANDLE — ALL OF THESE

### Pooling Edge Cases
- Rider books shared, gets matched, then cancels → re-compute fare for remaining riders; if only 1 rider left, convert to solo fare; notify remaining rider of fare change
- All riders in a pool cancel → cancel pool, release driver
- Pool is full (max_passengers reached) → stop accepting new riders into this pool
- Driver cancels a pooled ride mid-trip → complex: record how far each rider traveled, charge proportionally, find new driver for remaining riders
- Two pool-match jobs run simultaneously for the same ride → use Redlock distributed lock (key: lock:pool:{rideId})
- Rider added to pool but their fare would EXCEED solo fare → do not add them; keep them in SEARCHING state
- Pool matched but driver declines → find new driver for the entire pool (all existing riders remain in pool)
- Network error mid-pool-match → idempotent job design; BullMQ retry with exponential backoff

### Ride Edge Cases
- Driver goes offline mid-ride → mark ride as interrupted, alert rider, attempt to re-assign (for pooled: re-assign for all remaining riders)
- Rider's app crashes mid-ride → ride continues; status recoverable on app relaunch via GET /rides/:id
- OTP entered wrong 3 times → lock OTP for 10 min, alert rider via SMS, allow rider to regenerate OTP
- Google Maps API fails → fallback: compute distance via Haversine, use cached route if available in Redis
- Ride completed but payment fails → ride marked COMPLETED, payment stays PENDING; retry via payment.worker.js; notify user
- Driver marks ride complete when rider is not at destination → rider can dispute within 30 minutes

### Payment Edge Cases
- Razorpay webhook received twice (idempotent) → check Payment.razorpay_payment_id uniqueness before processing
- Wallet deduction race condition (two simultaneous payments) → use Prisma transaction with SELECT FOR UPDATE on User.wallet_balance
- Cash ride: driver marks paid but rider disputes → admin dispute flow
- Partial refund for cancelled pooled ride → calculate how much of the route was completed, refund remainder
- Payment success but DB update fails → webhook retry will reprocess; idempotent check on razorpay_payment_id

### Auth Edge Cases
- Same phone logs in on two devices → allow (separate refresh tokens per device_id)
- Refresh token reuse attack → if revoked token is used, revoke ALL tokens for that user
- OTP brute force → Redis-based lockout after 5 wrong attempts per phone
- Driver tries to use rider endpoints → role check middleware
- JWT secret rotation → keep old secret for 24h grace period

### Safety Edge Cases
- SOS triggered → immediately: send rider GPS to all emergency contacts via SMS, create SOS record in DB, emit to admin dashboard in real-time
- Route deviation >500m for >2 minutes → escalate: send rider a "are you safe?" push notification with SOS option
- Driver location stops updating for >60s during active ride → send rider notification, flag ride for review

---

## CONFIGURATION

**.env.example — include ALL of these variables:**

NODE_ENV=development

PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/rapido?schema=public

REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=

JWT_REFRESH_SECRET=

JWT_ACCESS_EXPIRY=15m

JWT_REFRESH_EXPIRY=30d
MSG91_API_KEY=

MSG91_SENDER_ID=RAPIDO

MSG91_OTP_TEMPLATE_ID=
GOOGLE_MAPS_API_KEY=

GOOGLE_MAPS_DIRECTIONS_URL=https://maps.googleapis.com/maps/api/directions/json

GOOGLE_MAPS_DISTANCE_MATRIX_URL=https://maps.googleapis.com/maps/api/distancematrix/json
RAZORPAY_KEY_ID=

RAZORPAY_KEY_SECRET=

RAZORPAY_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID=

FIREBASE_CLIENT_EMAIL=

FIREBASE_PRIVATE_KEY=
AWS_ACCESS_KEY_ID=

AWS_SECRET_ACCESS_KEY=

AWS_REGION=ap-south-1

AWS_S3_BUCKET=
SENTRY_DSN=
PLATFORM_COMMISSION_PERCENT=10

POOL_MATCH_WINDOW_SECONDS=300

POOL_MATCH_RADIUS_KM=3

POOL_ROUTE_OVERLAP_THRESHOLD=65

DRIVER_SEARCH_RADIUS_KM=5

DRIVER_ACCEPT_TIMEOUT_SECONDS=20

RIDE_CANCEL_FREE_WINDOW_MINUTES=2

ROUTE_DEVIATION_THRESHOLD_METERS=500

---

## ADDITIONAL REQUIREMENTS

1. **All DB queries that touch location data must use PostGIS** — never compute distances in application code when querying multiple records. Use ST_DWithin for radius queries, ST_Contains for zone detection.

2. **Redis key naming convention:**
   - rapido:drivers:online — Sorted set (geospatial)
   - rapido:pool:waiting:{vehicleType}:{rideType} — Hash of waiting pool requests
   - rapido:offer:{rideId}:{driverId} — String with 20s TTL
   - rapido:location:{driverId} — String (JSON) with 30s TTL
   - rapido:otp:attempts:{phone} — Counter with TTL
   - rapido:otp:lock:{phone} — Lock key
   - rapido:lock:pool:{rideId} — Redlock mutex
   - rapido:surge:cache:{zoneId} — Cached surge (5min TTL)

3. **BullMQ queues:**
   - rapido:pool-match — pool matching jobs (repeat every 30s for waiting rides)
   - rapido:find-driver — driver assignment jobs
   - rapido:notifications — async FCM + SMS
   - rapido:payment-retry — failed payment retry with backoff
   - rapido:ride-timeout — auto-cancel rides with no driver after 15 min

4. **Logging:** Every request logs: method, path, status, duration, user_id. Every queue job logs: queue, job_id, status, duration. Use Winston with JSON format in production, pretty in development.

5. **Graceful shutdown:** Handle SIGTERM — close HTTP server, drain BullMQ workers, close Redis and DB connections cleanly.

6. **Pagination:** All list endpoints use cursor-based pagination (cursor = last record's created_at + id). Include meta: { next_cursor, has_more, total }.

7. **Idempotency:** Payment endpoints accept Idempotency-Key header. Store results in Redis for 24h. Return cached result on duplicate.

8. **Health check:** GET /health → { status: 'ok', db: 'ok', redis: 'ok', timestamp }

9. **API versioning:** All routes under /api/v1/. Structure allows adding /api/v2/ without breaking existing clients.

10. **Security:**
    - helmet.js for HTTP headers
    - cors with whitelist
    - express-mongo-sanitize equivalent for SQL injection (Prisma handles this, but sanitize raw inputs)
    - Phone masking: never return full phone numbers of drivers/co-riders to riders; mask as +91 XXXXX X{last 4 digits}
    - S3 URLs: use presigned URLs with 1h expiry for document access; public URLs only for profile photos

11. **package.json scripts:**
    - dev: nodemon src/server.js
    - start: node src/server.js
    - migrate: prisma migrate deploy
    - migrate:dev: prisma migrate dev
    - seed: node prisma/seed.js
    - test: jest --runInBand
    - test:coverage: jest --coverage

---

## SEED DATA (prisma/seed.js)

Create:
- 1 admin user
- VehicleFareConfig for all 5 vehicle types with realistic Tamil Nadu fares
- 3 zones for Madurai district with sample GeoJSON polygons and surge multipliers
- 2 sample drivers with vehicles and approved KYC
- 5 sample riders

---

## DELIVERABLES

Generate ALL files completely. Do not use placeholder comments like "// implement later" or "// add logic here". Every function must have real, working implementation. Every route must have its controller, service, and schema implemented. Every edge case listed above must have explicit handling code.

Start with:
1. package.json
2. prisma/schema.prisma
3. src/config/ (all files)
4. src/utils/ (all files)
5. src/middleware/ (all files)
6. src/modules/ (all modules, in order listed)
7. src/workers/ and src/queues/
8. src/app.js and src/server.js
9. tests/
10. .env.example and README.md